import { registerStaticRoutes } from "@convex-dev/static-hosting";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  createMcpHandler,
  McpServer,
  originValidationResponse,
} from "@modelcontextprotocol/server";
import {
  describeRoute,
  generateSpecs,
  openAPIRouteHandler,
  resolver,
  validator,
} from "hono-openapi";
import {
  httpActionGeneric,
  httpRouter,
  makeFunctionReference,
  ROUTABLE_HTTP_METHODS,
  type DefaultFunctionArgs,
  type GenericActionCtx,
  type GenericDataModel,
  type HttpRouter,
} from "convex/server";
import {
  ConvexError,
  asObjectValidator,
  type GenericValidator,
} from "convex/values";
import { omit, pick } from "convex-helpers";
import { convexToZod } from "convex-helpers/server/zod4";
import { z } from "zod";
import { identityFields, type Auth } from "./lib/auth";
import { getFunctionMetadata } from "./lib/functions";
import { getPlatforms } from "./lib/platforms";

export type HttpOptions<DataModel extends GenericDataModel> = {
  auth: Auth<DataModel>;
  modules?: Record<string, Record<string, unknown>>;
  platforms?: string;
  staticHosting?: Parameters<typeof registerStaticRoutes>[1];
  http?: HttpRouter;
};

const convertValidator = convexToZod as unknown as (
  validator: GenericValidator,
) => z.ZodType;
function externalSchema(validator: GenericValidator) {
  // Convex IDs are strings on the wire. Zod handles nesting and optional fields.
  return z.fromJSONSchema(
    z.toJSONSchema(convertValidator(validator), {
      unrepresentable: ({ zodSchema }) =>
        zodSchema instanceof z.ZodCustom ? { type: "string" } : "throw",
    }),
  );
}

const openApiOptions = {
  documentation: {
    info: { title: "Disposabl API", version: "1.0.0" },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http" as const, scheme: "bearer" },
      },
    },
  },
};
const mcpMetadataPaths = [
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-protected-resource/mcp",
];

// Schema export uses the same routes without initializing auth or static hosting.
function createPlatformApp<DataModel extends GenericDataModel>({
  auth,
  modules = {},
  platforms,
}: Pick<HttpOptions<DataModel>, "modules" | "platforms"> & {
  auth?: Auth<DataModel>;
}) {
  const { isApiEnabled, isMcpEnabled } = getPlatforms(platforms);
  const app = new Hono<{ Bindings: GenericActionCtx<GenericDataModel> }>();
  app.onError((error, c) => {
    if (error instanceof HTTPException)
      return error.status === 400
        ? c.json({ code: "invalid_arguments" }, 400)
        : error.getResponse();
    const data = error instanceof ConvexError ? error.data : null;
    if (
      data &&
      typeof data === "object" &&
      typeof data.code === "string" &&
      typeof data.status === "number" &&
      data.status >= 400 &&
      data.status <= 599
    ) {
      return Response.json(
        { code: data.code },
        {
          status: data.status,
          headers:
            data.status === 401 && c.req.path === "/mcp"
              ? {
                  "WWW-Authenticate": `Bearer resource_metadata="${new URL("/.well-known/oauth-protected-resource/mcp", auth?.siteUrl).href}"`,
                }
              : undefined,
        },
      );
    }
    console.error(error);
    return Response.json({ code: "internal_error" }, { status: 500 });
  });

  const tools: ((
    server: McpServer,
    ctx: GenericActionCtx<GenericDataModel>,
    identity: Record<string, unknown>,
  ) => void)[] = [];
  for (const [modulePath, exports] of Object.entries(modules)) {
    for (const [name, fn] of Object.entries(exports)) {
      const definition = getFunctionMetadata(fn);
      if (!definition) continue;
      const api = isApiEnabled && definition.platforms?.includes("api");
      const mcp = isMcpEnabled && definition.platforms?.includes("mcp");
      if (!api && !mcp) continue;
      const identifier =
        name === "default" ? modulePath : `${modulePath}:${name}`;
      if (!definition.args || !definition.returns)
        throw new Error(
          `${identifier}: API/MCP functions require args and returns validators.`,
        );
      const args = asObjectValidator(definition.args);
      if (args.kind !== "object")
        throw new Error(
          `${identifier}: API/MCP args must be an object validator.`,
        );
      const identityKeys = Object.keys(args.fields).filter((key) =>
        Object.hasOwn(identityFields, key),
      );
      const input = externalSchema(
        asObjectValidator(omit(args.fields, identityKeys)),
      ) as z.ZodObject;
      const output = externalSchema(asObjectValidator(definition.returns));
      const query = Object.hasOwn(fn as object, "isQuery");
      const invoke = (
        ctx: GenericActionCtx<GenericDataModel>,
        input: DefaultFunctionArgs,
        identity: Record<string, unknown>,
      ) => {
        const args = { ...input, ...pick(identity, identityKeys) };
        return query
          ? ctx.runQuery(makeFunctionReference<"query">(identifier), args)
          : Object.hasOwn(fn as object, "isMutation")
            ? ctx.runMutation(
                makeFunctionReference<"mutation">(identifier),
                args,
              )
            : ctx.runAction(makeFunctionReference<"action">(identifier), args);
      };
      if (api) {
        // Query strings cannot represent every Convex JSON argument shape.
        const get = query && Object.keys(input.shape).length === 0;
        const target = get ? "query" : "json";
        const path = `/api/v1/${identifier.replace(/\/internal:/, "/").replace(":", "/")}`;
        app.on(
          get ? "GET" : "POST",
          path,
          describeRoute({
            operationId: identifier,
            security: [{ bearerAuth: [] }],
            responses: {
              400: {
                description: "Invalid arguments",
                content: {
                  "application/json": {
                    schema: resolver(
                      z.object({ code: z.literal("invalid_arguments") }),
                    ),
                  },
                },
              },
              200: {
                description: "Success",
                content: {
                  "application/json": { schema: resolver(output) },
                },
              },
            },
          }),
          validator(target, input, (result, c) => {
            if (!result.success)
              return c.json({ code: "invalid_arguments" }, 400);
          }),
          async (c) => {
            if (!auth) throw new Error("API authentication is not configured");
            const identity = /^Bearer\s+sk_/i.test(
              c.req.header("Authorization") ?? "",
            )
              ? await auth.requireApiUser(c.req.raw)
              : await auth.requireUser(c.env);
            const result = await invoke(c.env, c.req.valid(target), identity);
            return Response.json(result);
          },
        );
      }
      if (mcp)
        tools.push((server, ctx, identity) => {
          server.registerTool(
            identifier.replace(/[^a-zA-Z0-9_.-]/g, "_"),
            {
              inputSchema: input,
              outputSchema: z.object({ result: output }),
              annotations: { readOnlyHint: query },
            },
            async (input) => {
              const result = await invoke(ctx, input, identity);
              return {
                content: [{ type: "text", text: JSON.stringify(result) }],
                structuredContent: { result },
              };
            },
          );
        });
    }
  }
  if (isApiEnabled) {
    app.get("/openapi.json", openAPIRouteHandler(app, openApiOptions));
  }

  // A fresh MCP server handles each request without sessions.

  if (isMcpEnabled && auth) {
    const { siteUrl, requireUser, getAuthKitIssuer } = auth;
    for (const path of mcpMetadataPaths)
      app.get(path, async (c) =>
        c.json({
          resource: new URL("/mcp", siteUrl).href,
          authorization_servers: [await getAuthKitIssuer()],
          bearer_methods_supported: ["header"],
        }),
      );
    app.all("/mcp", async (c) => {
      const rejected = originValidationResponse(c.req.raw, [
        new URL(c.req.url).hostname,
      ]);
      if (rejected) return rejected;
      const identity = await requireUser(c.req.raw);
      const handler = createMcpHandler(
        () => {
          const server = new McpServer({ name: "disposabl", version: "1.0.0" });
          for (const register of tools) register(server, c.env, identity);
          return server;
        },
        { responseMode: "json", legacy: "stateless" },
      );
      try {
        return await handler.fetch(c.req.raw);
      } finally {
        await handler.close();
      }
    });
  }

  return app;
}

/** Export declared API routes locally without auth setup or deployment flags. */
export async function generateOpenApi(
  modules: NonNullable<HttpOptions<GenericDataModel>["modules"]>,
): ReturnType<typeof generateSpecs> {
  return generateSpecs(
    createPlatformApp({ modules, platforms: "api" }),
    openApiOptions,
  );
}

export function createHttp<DataModel extends GenericDataModel>({
  auth,
  modules,
  platforms,
  staticHosting,
  http = httpRouter(),
}: HttpOptions<DataModel>) {
  auth.registerRoutes(http);
  if (staticHosting) registerStaticRoutes(http, staticHosting);
  const { isApiEnabled, isMcpEnabled } = getPlatforms(platforms);
  if (!isApiEnabled && !isMcpEnabled) return http;
  const app = createPlatformApp({ auth, modules, platforms });

  // Explicit routes take precedence over the static site's GET catch-all.
  const forward = httpActionGeneric(async (ctx, request) =>
    app.fetch(request, ctx),
  );
  if (isApiEnabled) {
    http.route({ path: "/openapi.json", method: "GET", handler: forward });
    http.route({ pathPrefix: "/api/v1/", method: "GET", handler: forward });
    http.route({ pathPrefix: "/api/v1/", method: "POST", handler: forward });
  }
  if (isMcpEnabled) {
    for (const method of ROUTABLE_HTTP_METHODS)
      http.route({ path: "/mcp", method, handler: forward });
    for (const path of mcpMetadataPaths)
      http.route({ path, method: "GET", handler: forward });
  }
  return http;
}
