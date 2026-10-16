/// <reference lib="dom" />
import { expect, test } from "vitest";
import {
  accountInternalGetAccount,
  todoInternalCreateTodo,
} from "../../../generated/typescript";
import { createClient } from "../../../generated/typescript/client";

test("generated SDK sends bearer auth, GET requests, and flat JSON bodies", async () => {
  const requests: Request[] = [];
  const client = createClient({
    baseUrl: "https://example.convex.site",
    auth: "sk_test",
    fetch: (async (request) => {
      requests.push(request as Request);
      return Response.json(null);
    }) as typeof fetch,
  });
  await accountInternalGetAccount({ client });
  await todoInternalCreateTodo({ client, body: { text: "SDK test" } });
  expect(requests[0]!.url).toBe(
    "https://example.convex.site/api/v1/account/getAccount",
  );
  expect(requests[0]!.method).toBe("GET");
  expect(requests[1]!.url).toBe(
    "https://example.convex.site/api/v1/todo/createTodo",
  );
  expect(requests[1]!.method).toBe("POST");
  expect(await requests[1]!.json()).toEqual({ text: "SDK test" });
  for (const request of requests)
    expect(request.headers.get("authorization")).toBe("Bearer sk_test");
});

test("generated SDK exposes HTTP error status and response body", async () => {
  const client = createClient({
    baseUrl: "https://example.convex.site",
    fetch: Object.assign(
      async () => Response.json({ code: "invalid_api_key" }, { status: 401 }),
      { preconnect: () => {} },
    ),
  });
  const result = await accountInternalGetAccount({ client });
  expect(result.response?.status).toBe(401);
  expect(result.error).toEqual({ code: "invalid_api_key" });
});
