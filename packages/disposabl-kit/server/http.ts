import { registerStaticRoutes } from "@convex-dev/static-hosting";
import {
  httpActionGeneric,
  httpRouter,
  makeFunctionReference,
  ROUTABLE_HTTP_METHODS,
  type DefaultFunctionArgs,
} from "convex/server";
import { components } from "@disposabl/backend/_generated/api";
import {
  createMcpHandler,
  McpServer,
  originValidationResponse,
} from "@modelcontextprotocol/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import {
  describeRoute,
  generateSpecs,
  openAPIRouteHandler,
  resolver,
  validator,
  type GenerateSpecOptions,
} from "hono-openapi";
import {
  ConvexError,
  v,
  type GenericValidator,
  type ObjectType,
  type PropertyValidators,
} from "convex/values";
import { validate } from "convex-helpers/validators";
import { omit, pick } from "convex-helpers";
import { convexToZod } from "convex-helpers/server/zod4";
import { z } from "zod";
import { env, type ActionCtx } from "@disposabl/backend/_generated/server";
import {
  getAuthKitIssuer,
  requireMcpUser,
  requireUser,
  authKit,
} from "@disposabl/disposabl-kit/server/auth";
import { identityFields } from "@disposabl/disposabl-kit/server/lib/functions";
import {
  getPlatforms,
  type Platforms,
} from "@disposabl/disposabl-kit/server/lib/platforms";

type Identity = ObjectType<typeof identityFields>;
type Modules = Record<string, Record<string, unknown>>;
type PlatformFunction = {
  platforms?: Platforms;
  args?: PropertyValidators;
  returns?: GenericValidator;
  isInternal?: boolean;
  isQuery?: boolean;
  isMutation?: boolean;
  isAction?: boolean;
};

type HttpOptions = {
  modules: Modules;
  platforms?: string;
  authenticate?: (
    ctx: ActionCtx,
    request: Request,
    platform: "api" | "mcp",
  ) => Promise<Identity>;
};

const convertValidator = convexToZod as unknown as (
  validator: GenericValidator,
) => z.ZodType;

function externalSchema(validator: GenericValidator) {
  return z.fromJSONSchema(
    z.toJSONSchema(convertValidator(validator), {
      unrepresentable: ({ zodSchema }) =>
        zodSchema instanceof z.ZodCustom ? { type: "string" } : "throw",
    }),
  );
}

export function createHttp({
  modules,
  platforms = env.DISPOSABL_PLATFORMS ?? "",
  authenticate,
}: HttpOptions) {
  const mcpMetadataPaths = [
    "/.well-known/oauth-protected-resource",
    "/.well-known/oauth-protected-resource/mcp",
  ];
  const enabled = getPlatforms(platforms);
  const app = new Hono<{
    Bindings: ActionCtx;
    Variables: { user: Identity };
  }>();
  const identityValidator = v.object(identityFields);
  const errorSchema = z.object({
    code: z.string(),
    status: z.number().int().min(400).max(599),
  });

  async function requireIdentity(
    ctx: ActionCtx,
    request: Request,
    platform: "api" | "mcp",
  ) {
    const user = authenticate
      ? await authenticate(ctx, request, platform)
      : platform === "mcp"
        ? await requireMcpUser(request)
        : await requireUser(request);
    if (!validate(identityValidator, user))
      throw new ConvexError({ code: "invalid_identity", status: 403 });
    return pick(user, ["orgId", "userId", "role"]);
  }

  app.onError((error, c) => {
    if (error instanceof HTTPException)
      return c.json(
        { code: error.status === 400 ? "invalid_arguments" : "http_error" },
        error.status,
      );
    const parsed = errorSchema.safeParse(
      error instanceof ConvexError ? error.data : null,
    );
    if (parsed.success) {
      const { code, status } = parsed.data;
      return Response.json(
        { code },
        {
          status,
          headers:
            status === 401 && enabled.isMcpEnabled && c.req.path === "/mcp"
              ? {
                  "WWW-Authenticate": `Bearer resource_metadata="${new URL("/.well-known/oauth-protected-resource/mcp", env.CONVEX_SITE_URL).href}"`,
                }
              : undefined,
        },
      );
    }
    console.error(error);
    return c.json({ code: "internal_error" }, 500);
  });
  app.notFound((c) => c.json({ code: "not_found" }, 404));

  // API callers supply bearer tokens; cookie credentials are not enabled.
  if (enabled.isApiEnabled)
    app.use(
      "/api/v1/*",
      cors({
        origin: "*",
        allowMethods: ["POST"],
        allowHeaders: ["Authorization", "Content-Type"],
        maxAge: 86400,
      }),
    );

  app.use("/api/v1/*", async (c, next) => {
    if (!enabled.isApiEnabled) return c.notFound();
    c.set("user", await requireIdentity(c.env, c.req.raw, "api"));
    await next();
  });

  const names = new Set<string>();
  const reserve = (name: string) => {
    if (names.has(name))
      throw new Error(`Duplicate platform operation: ${name}`);
    names.add(name);
  };
  const tools: ((server: McpServer, ctx: ActionCtx, user: Identity) => void)[] =
    [];
  const mcpSchemas: Record<
    string,
    {
      inputSchema: z.core.JSONSchema.JSONSchema;
      outputSchema: z.core.JSONSchema.JSONSchema;
      readOnlyHint: boolean;
    }
  > = {};
  const errorResponse = {
    description: "Request failed",
    content: {
      "application/json": {
        schema: resolver(errorSchema.pick({ code: true })),
      },
    },
  };

  for (const [modulePath, exports] of Object.entries(modules)) {
    for (const [name, value] of Object.entries(exports)) {
      if (typeof value !== "function") continue;
      const fn = value as PlatformFunction;
      const api = fn.platforms?.includes("api");
      const mcp = fn.platforms?.includes("mcp");
      if (!api && !mcp) continue;
      const identifier =
        name === "default" ? modulePath : `${modulePath}:${name}`;
      if (
        !fn.isInternal ||
        !fn.args ||
        !fn.returns ||
        !(fn.isQuery || fn.isMutation || fn.isAction)
      )
        throw new Error(
          `${identifier}: expected an internal function with args and returns validators`,
        );
      for (const field of Object.keys(identityFields)) {
        if (fn.args[field]?.isOptional !== "required")
          throw new Error(
            `${identifier}: missing required identity field ${field}`,
          );
      }
      const fields = omit(fn.args, Object.keys(identityFields));
      const input = (externalSchema(v.object(fields)) as z.ZodObject).strict();
      const output = externalSchema(fn.returns);
      const invoke = (
        ctx: ActionCtx,
        input: DefaultFunctionArgs,
        user: Identity,
      ) => {
        const args = { ...input, ...user };
        return fn.isQuery
          ? ctx.runQuery(makeFunctionReference<"query">(identifier), args)
          : fn.isMutation
            ? ctx.runMutation(
                makeFunctionReference<"mutation">(identifier),
                args,
              )
            : ctx.runAction(makeFunctionReference<"action">(identifier), args);
      };

      if (api) {
        const path = `/api/v1/${identifier.replace(/\/internal:/, "/").replace(":", "/")}`;
        reserve(`POST ${path}`);
        app.post(
          path,
          describeRoute({
            operationId: identifier,
            summary: name,
            tags: [modulePath.replace(/\/internal$/, "")],
            security: [{ bearerAuth: [] }],
            responses: {
              200: {
                description: "Success",
                content: { "application/json": { schema: resolver(output) } },
              },
              400: errorResponse,
              401: errorResponse,
              403: errorResponse,
              503: errorResponse,
              default: errorResponse,
            },
          }),
          validator("json", input, (result, c) => {
            if (!result.success)
              return c.json({ code: "invalid_arguments" }, 400);
          }),
          async (c) =>
            Response.json(
              await invoke(c.env, c.req.valid("json"), c.get("user")),
            ),
        );
      }

      if (mcp) {
        const toolName = identifier.replace(/[^a-zA-Z0-9_.-]/g, "_");
        reserve(`MCP ${toolName}`);
        const toolOutput = z.object({ result: output });
        mcpSchemas[toolName] = {
          inputSchema: z.toJSONSchema(input),
          outputSchema: z.toJSONSchema(toolOutput),
          readOnlyHint: Boolean(fn.isQuery),
        };
        tools.push((server, ctx, user) => {
          server.registerTool(
            toolName,
            {
              inputSchema: input,
              outputSchema: toolOutput,
              annotations: { readOnlyHint: Boolean(fn.isQuery) },
            },
            async (input) => {
              const result = await invoke(ctx, input, user);
              return {
                content: [{ type: "text", text: JSON.stringify(result) }],
                structuredContent: { result },
              };
            },
          );
        });
      }
    }
  }

  const openapiOptions: Partial<GenerateSpecOptions> = {
    exclude: ["/openapi.json", "/mcp", ...mcpMetadataPaths],
    documentation: {
      info: { title: "Disposabl API", version: "1.0.0" },
      components: {
        securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } },
      },
    },
  };
  if (enabled.isApiEnabled)
    app.get("/openapi.json", openAPIRouteHandler(app, openapiOptions));

  if (enabled.isMcpEnabled) {
    for (const path of mcpMetadataPaths) {
      app.get(path, async (c) =>
        c.json({
          resource: new URL("/mcp", env.CONVEX_SITE_URL).href,
          authorization_servers: [await getAuthKitIssuer()],
          bearer_methods_supported: ["header"],
        }),
      );
    }
    app.all("/mcp", async (c) => {
      const rejected = originValidationResponse(c.req.raw, [
        new URL(c.req.url).hostname,
      ]);
      if (rejected) return rejected;
      const user = await requireIdentity(c.env, c.req.raw, "mcp");
      const handler = createMcpHandler(
        () => {
          const server = new McpServer({ name: "disposabl", version: "1.0.0" });
          for (const register of tools) register(server, c.env, user);
          return server;
        },
        { legacy: "stateless" },
      );
      try {
        return await handler.fetch(c.req.raw);
      } finally {
        await handler.close();
      }
    });
  }

  // Generation uses app without initializing AuthKit or requiring credentials.
  let router: ReturnType<typeof httpRouter>;
  return {
    app,
    async openapi() {
      return {
        ...(await generateSpecs(app, openapiOptions)),
        "x-mcp-tools": mcpSchemas,
      };
    },
    get router() {
      if (router) return router;
      const http = httpRouter();
      authKit.registerRoutes(http);
      const handler = httpActionGeneric(async (ctx, request) =>
        app.fetch(request, ctx),
      );
      // Reserve disabled transport URLs so the SPA fallback cannot serve them.
      for (const method of ROUTABLE_HTTP_METHODS) {
        http.route({ pathPrefix: "/api/v1/", method, handler });
        for (const path of ["/openapi.json", "/mcp", ...mcpMetadataPaths])
          http.route({ path, method, handler });
      }
      registerStaticRoutes(http, components.staticHosting, {
        pathPrefix: "/",
        spaFallback: true,
      });
      return (router = http);
    },
  };
}
