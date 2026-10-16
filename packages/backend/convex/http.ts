import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  createMcpHandler,
  McpServer,
  originValidationResponse,
} from "@modelcontextprotocol/server";
import {
  HttpRouterWithHono,
  type HonoWithConvex,
} from "convex-helpers/server/hono";
import {
  describeRoute,
  openAPIRouteHandler,
  resolver,
  validator,
} from "hono-openapi";
import { makeFunctionReference, type DefaultFunctionArgs } from "convex/server";
import { ConvexError } from "convex/values";
import { z } from "zod";
import { createHttp } from "disposabl-kit/server";
import { components } from "./_generated/api";
import { env, httpAction, type ActionCtx } from "./_generated/server";
import { authkit, requireApiUser, requireUser, getAuthKitIssuer } from "./auth";

// Assume this array is generated. Inputs contain only caller-supplied fields.
const apiFunctions = [
  {
    identifier: "todo/internal:createTodo",
    type: "mutation",
    input: z.object({ text: z.string() }).strict(),
    output: z.string(),
  },
  {
    identifier: "todo/internal:getTodo",
    type: "query",
    input: z.object({ id: z.string() }).strict(),
    output: z
      .object({
        _id: z.string(),
        _creationTime: z.number(),
        text: z.string(),
        userId: z.string(),
        orgId: z.string(),
      })
      .nullable(),
  },
] as const;

function runFunction(
  ctx: ActionCtx,
  {
    identifier,
    type,
  }: { identifier: string; type: "query" | "mutation" | "action" },
  args: DefaultFunctionArgs,
) {
  return type === "query"
    ? ctx.runQuery(makeFunctionReference<"query">(identifier), args)
    : type === "mutation"
      ? ctx.runMutation(makeFunctionReference<"mutation">(identifier), args)
      : ctx.runAction(makeFunctionReference<"action">(identifier), args);
}

const app: HonoWithConvex<ActionCtx> = new Hono();
app.onError((error, c) => {
  if (error instanceof HTTPException) return error.getResponse();
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
                "WWW-Authenticate": `Bearer resource_metadata="${new URL("/.well-known/oauth-protected-resource/mcp", env.CONVEX_SITE_URL).href}"`,
              }
            : undefined,
      },
    );
  }
  console.error(error);
  return Response.json({ code: "internal_error" }, { status: 500 });
});

/* ==================== API ROUTES ====================
 * GET for queries; POST for mutations and actions.
 * Zod validates inputs and describes OpenAPI responses.
 * API-key or user-token identity is injected before calling Convex.
 */
for (const { identifier, type, input, output } of apiFunctions) {
  const target = type === "query" ? "query" : "json";
  const path = `/api/v1/${identifier.replace(/\/internal:/, "/").replace(":", "/")}`;
  app.on(
    type === "query" ? "GET" : "POST",
    path,
    describeRoute({
      operationId: identifier,
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": { schema: resolver(output) },
          },
        },
      },
    }),
    validator(target, input, (result, c) => {
      if (!result.success) return c.json({ code: "invalid_arguments" }, 400);
    }),
    async (c) => {
      const identity = /^Bearer\s+sk_/i.test(c.req.header("Authorization") ?? "")
        ? await requireApiUser(c.req.raw)
        : await requireUser(c.env);
      const args = { ...c.req.valid(target), ...identity };
      const result = await runFunction(c.env, { identifier, type }, args);
      return Response.json(result);
    },
  );
}

app.get(
  "/openapi.json",
  openAPIRouteHandler(app, {
    documentation: {
      info: { title: "Disposabl API", version: "1.0.0" },
      components: {
        securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } },
      },
    },
  }),
);

/* ==================== MCP TOOLS =====================
 * Reuse apiFunctions as tools with the same Zod schemas.
 * Verify OAuth tokens and inject trusted identity.
 * A fresh v2 server handles each request without sessions.
 */
const mcpMetadataPaths = [
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-protected-resource/mcp",
];
for (const path of mcpMetadataPaths)
  app.get(path, async (c) =>
    c.json({
      resource: new URL("/mcp", env.CONVEX_SITE_URL).href,
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
      for (const fn of apiFunctions) {
        server.registerTool(
          fn.identifier.replace(/[^a-zA-Z0-9_.-]/g, "_"),
          {
            inputSchema: fn.input as z.ZodObject,
            outputSchema: z.object({ result: fn.output }),
            annotations: { readOnlyHint: fn.type === "query" },
          },
          async (input) => {
            const result = await runFunction(c.env, fn, {
              ...input,
              ...identity,
            });
            return {
              content: [{ type: "text", text: JSON.stringify(result) }],
              structuredContent: { result },
            };
          },
        );
      }
      return server;
    },
    { responseMode: "json", legacy: "reject" },
  );
  try {
    return await handler.fetch(c.req.raw);
  } finally {
    await handler.close();
  }
});

const http = createHttp({
  http: new HttpRouterWithHono(app),
  authKit: authkit(),
  webhookSecret: env.WORKOS_WEBHOOK_SECRET,
  staticHosting: components.staticHosting,
});
// Forward GET requests before the static site's catch-all route.
const forward = httpAction(async (ctx, request) => app.fetch(request, ctx));
http.route({ path: "/openapi.json", method: "GET", handler: forward });
http.route({ pathPrefix: "/api/v1/", method: "GET", handler: forward });
http.route({ path: "/mcp", method: "GET", handler: forward });
for (const path of mcpMetadataPaths)
  http.route({ path, method: "GET", handler: forward });
export default http;
