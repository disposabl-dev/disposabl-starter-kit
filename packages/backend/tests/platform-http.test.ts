import { expect, test, vi } from "vitest";
import {
  getFunctionName,
  httpActionGeneric,
  httpRouter,
  internalQueryGeneric,
  type GenericActionCtx,
  type GenericDataModel,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { createFunctions, identityFields } from "disposabl-kit/server/lib";
import { createHttp } from "disposabl-kit/server";

function setup(enabled = "api", extra: Record<string, unknown> = {}) {
  const identity = {
    orgId: "org_test",
    userId: "user_test",
    role: "admin" as const,
  };
  const auth = {
    authkit: vi.fn(),
    identityFields,
    siteUrl: "https://test.convex.site",
    registerRoutes: vi.fn(),
    requireApiUser: vi.fn().mockResolvedValue(identity),
    requireUser: vi.fn().mockResolvedValue(identity),
    getAuthKitIssuer: vi.fn().mockResolvedValue("https://test.authkit.app"),
  };
  const { internalQuery, internalMutation } = createFunctions();
  const modules = {
    example: {
      ...extra,
      native: internalQueryGeneric({ handler: () => null }),
      hidden: internalQuery({ handler: () => null }),
      read: internalQuery({
        platforms: ["api"],
        args: {},
        returns: v.null(),
        handler: () => null,
      }),
      write: internalMutation({
        platforms: ["api"],
        args: { userId: identityFields.userId, text: v.string() },
        returns: v.null(),
        handler: () => null,
      }),
      tool: internalQuery({
        platforms: ["mcp"],
        args: {},
        returns: v.null(),
        handler: () => null,
      }),
    },
  };
  const http = httpRouter();
  const custom = httpActionGeneric(async () => new Response("custom"));
  http.route({ path: "/custom", method: "GET", handler: custom });
  expect(createHttp({ platforms: enabled, modules, auth, http })).toBe(http);
  const ctx = {
    runQuery: vi.fn().mockResolvedValue(null),
    runMutation: vi.fn().mockResolvedValue(null),
  };
  const request = (
    path: string,
    body?: object,
    token = "sk_test",
    headers: Record<string, string> = {},
  ) => {
    const method = body ? "POST" : "GET";
    const handler = http.lookup(path, method)![0] as unknown as {
      _handler(
        ctx: GenericActionCtx<GenericDataModel>,
        request: Request,
      ): Promise<Response>;
    };
    return handler._handler(
      ctx as unknown as GenericActionCtx<GenericDataModel>,
      new Request(`https://test.convex.site${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...headers,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    );
  };
  return { http, custom, ctx, auth, request };
}

test("preserves custom routes and keeps API routes ahead of static hosting", async () => {
  const { http, custom, request } = setup();
  const staticHandler = httpActionGeneric(async () => new Response("static"));
  http.route({ pathPrefix: "/", method: "GET", handler: staticHandler });
  expect(http.lookup("/custom", "GET")?.[0]).toBe(custom);
  expect(http.lookup("/dashboard", "GET")?.[0]).toBe(staticHandler);
  expect(http.lookup("/api/v1/example/read", "GET")?.[0]).not.toBe(
    staticHandler,
  );
  const spec = (await (await request("/openapi.json")).json()) as {
    paths: Record<string, unknown>;
  };
  expect(Object.keys(spec.paths)).toEqual([
    "/api/v1/example/read",
    "/api/v1/example/write",
  ]);
});

test.each(["", "api", "mcp"])(
  "registers only enabled transports: %s",
  (enabled) => {
    const { http } = setup(enabled);
    expect(http.lookup("/openapi.json", "GET") !== null).toBe(
      enabled === "api",
    );
    expect(http.lookup("/api/v1/example/write", "POST") !== null).toBe(
      enabled === "api",
    );
    expect(http.lookup("/mcp", "POST") !== null).toBe(enabled === "mcp");
    expect(
      http.lookup("/.well-known/oauth-protected-resource/mcp", "GET") !== null,
    ).toBe(enabled === "mcp");
  },
);

test("dispatches API keys and user sessions while injecting only declared identity", async () => {
  const { request, ctx, auth } = setup();
  expect(
    (await request("/api/v1/example/write", { text: "hello" })).status,
  ).toBe(200);
  expect(getFunctionName(ctx.runMutation.mock.calls[0]![0])).toBe(
    "example:write",
  );
  expect(ctx.runMutation.mock.calls[0]![1]).toEqual({
    text: "hello",
    userId: "user_test",
  });
  expect(auth.requireApiUser).toHaveBeenCalledOnce();
  expect(
    (await request("/api/v1/example/read", undefined, "session_token")).status,
  ).toBe(200);
  expect(ctx.runQuery.mock.calls[0]![1]).toEqual({});
  expect(auth.requireUser).toHaveBeenCalledWith(ctx);
});

test("rejects spoofed identity and preserves authentication errors", async () => {
  const { request, ctx, auth } = setup();
  const spoofed = await request("/api/v1/example/write", {
    text: "hello",
    userId: "user_attacker",
  });
  expect(spoofed.status).toBe(400);
  expect(await spoofed.json()).toEqual({ code: "invalid_arguments" });
  expect(ctx.runMutation).not.toHaveBeenCalled();
  auth.requireApiUser.mockRejectedValue(
    new ConvexError({ code: "invalid_api_key", status: 401 }),
  );
  const rejected = await request("/api/v1/example/write", { text: "hello" });
  expect(rejected.status).toBe(401);
  expect(await rejected.json()).toEqual({ code: "invalid_api_key" });
  expect(ctx.runMutation).not.toHaveBeenCalled();
});

test("converts nested optional IDs and return maps without making optional fields required", async () => {
  const { internalMutation } = createFunctions();
  const save = internalMutation({
    platforms: ["api"],
    args: v.object({
      userId: identityFields.userId,
      nested: v.object({ id: v.optional(v.id("todos")) }),
      ids: v.array(v.id("todos")),
    }),
    returns: { id: v.optional(v.id("todos")) },
    handler: () => ({}),
  });
  const { request, ctx } = setup("api", { save });
  expect(
    (await request("/api/v1/example/save", { nested: {}, ids: ["id_test"] }))
      .status,
  ).toBe(200);
  expect(ctx.runMutation.mock.calls[0]![1]).toEqual({
    nested: {},
    ids: ["id_test"],
    userId: "user_test",
  });
  expect(
    (await request("/api/v1/example/save", { nested: { id: 123 }, ids: [] }))
      .status,
  ).toBe(400);
  const spec = await (await request("/openapi.json")).json();
  expect(spec).toMatchObject({
    paths: {
      "/api/v1/example/save": {
        post: {
          responses: {
            "200": {
              content: {
                "application/json": {
                  schema: { properties: { id: { type: "string" } } },
                },
              },
            },
          },
        },
      },
    },
  });
});

test("requires schemas only for selected, enabled functions", () => {
  const { internalQuery } = createFunctions();
  const missing = internalQuery({ platforms: ["api"], handler: () => null });
  expect(() => setup("mcp", { missing })).not.toThrow();
  expect(() => setup("api", { missing })).toThrow(
    "example:missing: API/MCP functions require args and returns validators.",
  );
});

test("serves the Codex 2025 MCP handshake, tool discovery, and read calls without sessions", async () => {
  const { internalQuery } = createFunctions();
  const lookup = internalQuery({
    platforms: ["mcp"],
    args: { ...identityFields, id: v.string() },
    returns: v.object({ text: v.string() }),
    handler: () => ({ text: "read" }),
  });
  const { request, ctx, auth } = setup("mcp", { lookup });
  const headers = {
    Accept: "application/json, text/event-stream",
    "MCP-Protocol-Version": "2025-06-18",
  };
  const rpc = (id: number, method: string, params?: object) =>
    request(
      "/mcp",
      {
        jsonrpc: "2.0",
        id,
        method,
        ...(params ? { params } : {}),
      },
      "oauth_access_token",
      headers,
    );
  const readMessage = async (response: Response) => {
    const text = await response.text();
    const data = response.headers
      .get("Content-Type")
      ?.includes("text/event-stream")
      ? text
          .split("\n")
          .find((line) => line.startsWith("data:"))
          ?.slice(5)
      : text;
    if (!data) throw new Error("MCP response did not contain a message");
    return JSON.parse(data);
  };
  const initialized = await rpc(1, "initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "codex-regression", version: "1.0.0" },
  });
  expect(initialized.status).toBe(200);
  expect(initialized.headers.get("Mcp-Session-Id")).toBeNull();
  expect(await readMessage(initialized)).toMatchObject({
    jsonrpc: "2.0",
    id: 1,
    result: { protocolVersion: "2025-06-18", capabilities: { tools: {} } },
  });
  // Each request creates a fresh server, as a native stateless MCP client does.
  const listed = await rpc(2, "tools/list");
  expect(listed.status).toBe(200);
  const discovery = await readMessage(listed);
  expect(discovery).toMatchObject({
    id: 2,
    result: {
      tools: expect.arrayContaining([
        expect.objectContaining({
          name: "example_lookup",
          annotations: { readOnlyHint: true },
        }),
      ]),
    },
  });
  expect(
    discovery.result.tools.find(
      (tool: { name: string }) => tool.name === "example_lookup",
    ).inputSchema.properties,
  ).toEqual({ id: { type: "string" } });
  ctx.runQuery.mockResolvedValue({ text: "read" });
  const called = await rpc(3, "tools/call", {
    name: "example_lookup",
    arguments: { id: "todo_test" },
  });
  expect(called.status).toBe(200);
  expect(await readMessage(called)).toMatchObject({
    id: 3,
    result: {
      content: [{ type: "text", text: JSON.stringify({ text: "read" }) }],
      structuredContent: { result: { text: "read" } },
    },
  });
  expect(getFunctionName(ctx.runQuery.mock.calls[0]![0])).toBe(
    "example:lookup",
  );
  expect(ctx.runQuery.mock.calls[0]![1]).toEqual({
    id: "todo_test",
    orgId: "org_test",
    userId: "user_test",
    role: "admin",
  });
  expect(auth.requireUser).toHaveBeenCalledTimes(3);
  for (const [source] of auth.requireUser.mock.calls)
    expect(source).toBeInstanceOf(Request);
});
