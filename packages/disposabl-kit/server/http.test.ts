import { expect, spyOn, test } from "bun:test";
import { getFunctionName, ROUTABLE_HTTP_METHODS } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { ActionCtx } from "@disposabl/backend/_generated/server";
import * as auth from "./auth";
import { createHttp } from "./http";
import { identityFields, internalQuery } from "./lib/functions";

const identity = {
  orgId: "org_http_test",
  userId: "user_http_test",
  role: "member" as const,
};
const definition = {
  args: { ...identityFields, value: v.string() },
  returns: v.string(),
  handler: async () => "ok",
};
const modules = {
  "fixture/internal": {
    apiOnly: internalQuery({ ...definition, platforms: ["api"] }),
    mcpOnly: internalQuery({ ...definition, platforms: ["mcp"] }),
    both: internalQuery({ ...definition, platforms: ["api", "mcp"] }),
    neither: internalQuery(definition),
  },
};
const metadata = [
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-protected-resource/mcp",
];
async function notFound(response: Response) {
  expect(response.status).toBe(404);
  expect(response.headers.get("content-type")).toContain("application/json");
  expect(await response.json()).toEqual({ code: "not_found" });
}
async function message(response: Response) {
  expect(response.status).toBe(200);
  const body = await response.text();
  return JSON.parse(
    response.headers.get("content-type")?.includes("text/event-stream")
      ? body
          .split("\n")
          .find((line) => line.startsWith("data: "))!
          .slice(6)
      : body,
  );
}

test.each([
  { platforms: "", api: false, mcp: false },
  { platforms: "api", api: true, mcp: false },
  { platforms: "mcp", api: false, mcp: true },
  { platforms: "api,mcp", api: true, mcp: true },
])("global transports: API=$api MCP=$mcp", async ({ platforms, api, mcp }) => {
  const previousSite = process.env.CONVEX_SITE_URL;
  process.env.CONVEX_SITE_URL = "https://http-test.convex.site";
  const discovery = spyOn(auth, "getAuthKitIssuer").mockResolvedValue(
    "https://http-test.authkit.app",
  );
  const registration = spyOn(auth.authKit, "registerRoutes").mockImplementation(
    () => {},
  );
  try {
    const calls: { name: string; args: unknown }[] = [];
    const ctx = {
      runQuery: async (
        ref: Parameters<typeof getFunctionName>[0],
        args: unknown,
      ) => {
        calls.push({ name: getFunctionName(ref), args });
        return "ok";
      },
    } as unknown as ActionCtx;
    const http = createHttp({
      modules,
      platforms,
      authenticate: async (_ctx, req) => {
        if (req.headers.get("authorization") !== "Bearer fixture")
          throw new ConvexError({ code: "unauthenticated", status: 401 });
        return identity;
      },
    });
    const router = http.router;
    const spa = router.lookup("/dashboard", "GET")![0];
    const request = async (path: string, init?: RequestInit) => {
      const req = new Request(`https://http-test.convex.site${path}`, init);
      const route = router.lookup(path, req.method as "GET" | "POST")!;
      expect(route[0]).not.toBe(spa);
      return (
        route[0] as unknown as {
          _handler: (ctx: ActionCtx, req: Request) => Promise<Response>;
        }
      )._handler(ctx, req);
    };
    const post = (path: string, body: unknown, authorized = true) =>
      request(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          ...(authorized ? { Authorization: "Bearer fixture" } : {}),
        },
        body: JSON.stringify(body),
      });
    const rpc = (method: string, params?: unknown) =>
      post("/mcp", { jsonrpc: "2.0", id: 1, method, params });
    for (const method of ROUTABLE_HTTP_METHODS)
      for (const path of [
        "/api/v1/fixture/both",
        "/mcp",
        "/openapi.json",
        ...metadata,
      ])
        expect(router.lookup(path, method)![0]).not.toBe(spa);

    const spec = await request("/openapi.json");
    if (api) {
      expect(spec.status).toBe(200);
      const served = (await spec.json()) as {
        paths: Record<string, { post: { requestBody: unknown } }>;
      };
      expect(Object.keys(served.paths).sort()).toEqual([
        "/api/v1/fixture/apiOnly",
        "/api/v1/fixture/both",
      ]);
      expect(
        JSON.stringify(served.paths["/api/v1/fixture/both"]!.post.requestBody),
      ).not.toMatch(/orgId|userId|role/);
    } else await notFound(spec);
    for (const name of ["apiOnly", "both"]) {
      const response = await post(`/api/v1/fixture/${name}`, { value: "api" });
      if (api) {
        expect(response.status).toBe(200);
        expect(await response.json()).toBe("ok");
      } else await notFound(response);
    }
    for (const name of ["mcpOnly", "neither"])
      await notFound(
        await post(`/api/v1/fixture/${name}`, { value: "hidden" }),
      );
    if (api) {
      expect(
        (await post("/api/v1/fixture/both", { value: "forged", ...identity }))
          .status,
      ).toBe(400);
      expect((await post("/api/v1/fixture/both", { value: 123 })).status).toBe(
        400,
      );
    }
    for (const path of metadata) {
      const response = await request(path);
      if (mcp) {
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({
          resource: "https://http-test.convex.site/mcp",
          authorization_servers: ["https://http-test.authkit.app"],
        });
      } else await notFound(response);
    }
    expect(discovery).toHaveBeenCalledTimes(mcp ? 2 : 0);
    const listed = await rpc("tools/list");
    if (mcp) {
      const result = await message(listed);
      expect(result.error).toBeUndefined();
      expect(
        result.result.tools.map((tool: { name: string }) => tool.name).sort(),
      ).toEqual(["fixture_internal_both", "fixture_internal_mcpOnly"]);
      for (const tool of result.result.tools)
        expect(Object.keys(tool.inputSchema.properties)).toEqual(["value"]);
      for (const name of ["both", "mcpOnly"]) {
        const response = await message(
          await rpc("tools/call", {
            name: `fixture_internal_${name}`,
            arguments: { value: "mcp" },
          }),
        );
        expect(response.result.structuredContent).toEqual({ result: "ok" });
      }
      for (const name of ["apiOnly", "neither"])
        expect(
          (
            await message(
              await rpc("tools/call", {
                name: `fixture_internal_${name}`,
                arguments: { value: "hidden" },
              }),
            )
          ).error,
        ).toMatchObject({ code: -32602 });
      const forged = await message(
        await rpc("tools/call", {
          name: "fixture_internal_both",
          arguments: { value: "forged", ...identity },
        }),
      );
      expect(forged.result.isError).toBe(true);
    } else {
      await notFound(listed);
      await notFound(
        await rpc("tools/call", {
          name: "fixture_internal_both",
          arguments: { value: "disabled" },
        }),
      );
    }
    for (const [path, enabled] of [
      ["/api/v1/fixture/both", api],
      ["/mcp", mcp],
    ] as const) {
      const response = await post(path, {}, false);
      if (enabled) {
        expect(response.status).toBe(401);
        if (path === "/mcp")
          expect(response.headers.get("www-authenticate")).toContain(
            "/.well-known/oauth-protected-resource/mcp",
          );
      } else await notFound(response);
    }
    expect(calls).toHaveLength((api ? 2 : 0) + (mcp ? 2 : 0));
    for (const call of calls) expect(call.args).toMatchObject(identity);
    // Offline generation retains both accepted contracts even with routes disabled.
    const contract = await http.openapi();
    expect(Object.keys(contract.paths ?? {})).toHaveLength(2);
    expect(Object.keys(contract["x-mcp-tools"])).toHaveLength(2);
  } finally {
    discovery.mockRestore();
    registration.mockRestore();
    if (previousSite === undefined) delete process.env.CONVEX_SITE_URL;
    else process.env.CONVEX_SITE_URL = previousSite;
  }
});
