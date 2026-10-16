import { test, expect } from "vitest";
import { createHttp } from "disposabl-kit/server";
import { generateOpenApi } from "../../disposabl-kit/src/server/http";
import type { Auth } from "disposabl-kit/server/lib";
import type { GenericActionCtx, GenericDataModel } from "convex/server";
import { createFunctions } from "disposabl-kit/server/lib/functions";
import { v } from "convex/values";

const { internalQuery } = createFunctions();
const modules = {
  example: {
    empty: internalQuery({
      platforms: ["api"],
      args: {},
      returns: v.null(),
      handler: () => null,
    }),
    read: internalQuery({
      platforms: ["api"],
      args: {
        count: v.number(),
        flag: v.boolean(),
        nested: v.object({ values: v.array(v.number()) }),
      },
      returns: v.null(),
      handler: () => null,
    }),
  },
};
function setup() {
  const calls: unknown[] = [];
  const auth = {
    registerRoutes() {},
    requireUser: async () => ({}),
    requireApiUser: async () => ({}),
  } as unknown as Auth;
  const http = createHttp({ auth, modules, platforms: "api" });
  const ctx = {
    runQuery: async (_ref: unknown, args: unknown) => {
      calls.push(args);
      return null;
    },
  } as unknown as GenericActionCtx<GenericDataModel>;
  const request = async (
    name: string,
    method: "GET" | "POST",
    body?: string,
  ) => {
    const path = `/api/v1/example/${name}`;
    const [handler] = http.lookup(path, method)!;
    return (
      handler as unknown as {
        _handler(
          ctx: GenericActionCtx<GenericDataModel>,
          request: Request,
        ): Promise<Response>;
      }
    )._handler(
      ctx,
      new Request(`https://test.convex.site${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer session",
        },
        ...(body === undefined ? {} : { body }),
      }),
    );
  };
  return { calls, request };
}
test("argument-free query remains GET", async () => {
  const { request, calls } = setup();
  expect((await request("empty", "GET")).status).toBe(200);
  expect(calls).toEqual([{}]);
  expect(
    (await generateOpenApi(modules)).paths!["/api/v1/example/empty"],
  ).toHaveProperty("get");
});
test("query arguments use JSON POST and preserve false, numbers, and nested arrays", async () => {
  const { request, calls } = setup();
  const input = { count: 3, flag: false, nested: { values: [1, 2] } };
  expect((await request("read", "POST", JSON.stringify(input))).status).toBe(
    200,
  );
  expect(calls).toEqual([input]);
  const operation = (await generateOpenApi(modules)).paths![
    "/api/v1/example/read"
  ];
  expect(operation).toHaveProperty("post");
  expect(operation).not.toHaveProperty("get");
});
test("invalid and malformed JSON use documented 400 body", async () => {
  const { request, calls } = setup();
  for (const body of ["{}", "{broken"]) {
    const response = await request("read", "POST", body);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ code: "invalid_arguments" });
  }
  expect(calls).toHaveLength(0);
  const operation = (await generateOpenApi(modules)).paths![
    "/api/v1/example/read"
  ]!.post!;
  expect(operation.responses!["400"]).toMatchObject({
    content: {
      "application/json": {
        schema: {
          properties: { code: { const: "invalid_arguments" } },
          required: ["code"],
        },
      },
    },
  });
});
