import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import { expect, test } from "vitest";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../convex/lib/functions";
import schema from "../convex/schema";

test("wrapped builders retain native execution, validation, and opt-in metadata", async () => {
  const read = internalQuery({
    args: { id: v.id("todos") },
    returns: v.union(v.string(), v.null()),
    handler: async (ctx, { id }) => (await ctx.db.get(id))?.text ?? null,
  });
  const write = internalMutation({
    platforms: { api: true, cli: true, mcp: false },
    args: { text: v.string() },
    returns: v.id("todos"),
    handler: (ctx, { text }) =>
      ctx.db.insert("todos", { text, userId: "user_test", orgId: "org_test" }),
  });
  const run = internalAction({
    platforms: false,
    args: { id: v.id("todos") },
    returns: v.union(v.string(), v.null()),
    handler: (ctx, args) =>
      ctx.runQuery(makeFunctionReference<"query">("wrapped:read"), args),
  });
  const modules = import.meta.glob("../convex/**/*.{js,ts}");
  modules["../convex/wrapped.ts"] = async () => ({ read, write, run });
  const t = convexTest(schema, modules);

  for (const fn of [read, write, run]) {
    expect(fn).toHaveProperty("isInternal", true);
    expect(fn).not.toHaveProperty("isPublic", true);
  }
  expect(read).toHaveProperty("platforms", false);
  expect(run).toHaveProperty("platforms", false);
  expect(write).toHaveProperty("platforms", {
    api: true,
    cli: true,
    mcp: false,
  });
  const id = await t.mutation(
    makeFunctionReference<"mutation">("wrapped:write"),
    {
      text: "Wrapped builders work",
    },
  );
  expect(
    await t.action(makeFunctionReference<"action">("wrapped:run"), { id }),
  ).toBe("Wrapped builders work");
  await expect(
    t.mutation(makeFunctionReference<"mutation">("wrapped:write"), {
      text: 42,
    }),
  ).rejects.toThrow();
});
