import { expect, expectTypeOf, test } from "vitest";
import { convexTest } from "convex-test";
import {
  internalQueryGeneric,
  makeFunctionReference,
  type RegisteredAction,
} from "convex/server";
import { v } from "convex/values";
import { createFunctions } from "disposabl-kit/server/lib";
import { getFunctionMetadata } from "../../disposabl-kit/src/server/lib/functions";
import schema from "../convex/schema";
import type { DataModel, Id } from "../convex/_generated/dataModel";

const { internalQuery, internalMutation, internalAction } =
  createFunctions<DataModel>();

test("captures only explicit platform opt-ins without exposing native functions", () => {
  const args = v.object({ id: v.id("todos") });
  const returns = { id: v.id("todos") };
  const selected = internalQuery({
    platforms: ["api", "mcp"],
    args,
    returns,
    handler: (_ctx, args) => args,
  });
  expect(getFunctionMetadata(selected)).toMatchObject({
    platforms: ["api", "mcp"],
    args,
    returns,
  });
  for (const fn of [
    internalQueryGeneric({ handler: () => null }),
    internalQuery({ handler: () => null }),
    internalQuery({ platforms: [], handler: () => null }),
    () => null,
    null,
    1,
    "constant",
  ])
    expect(getFunctionMetadata(fn)).toBeUndefined();
});

test("native shorthand, omitted validators, and object validators execute normally", async () => {
  const plain = internalQuery({ handler: () => "plain" });
  const shorthand = internalMutation(() => null);
  const argsOnly = internalAction({
    args: { text: v.string() },
    handler: (_ctx, { text }) => text.toUpperCase(),
  });
  const objectValidator = internalQuery({
    args: v.object({ text: v.string() }),
    returns: { text: v.string() },
    handler: (_ctx, args) => args,
  });
  expectTypeOf(argsOnly).toMatchTypeOf<
    RegisteredAction<"internal", { text: string }, string>
  >();
  const t = convexTest(schema, {
    "../convex/_generated/server.ts": () =>
      import("../convex/_generated/server"),
    "../convex/native.ts": async () => ({
      plain,
      shorthand,
      argsOnly,
      objectValidator,
    }),
  });
  expect(
    await t.query(makeFunctionReference<"query">("native:plain"), {}),
  ).toBe("plain");
  expect(
    await t.mutation(makeFunctionReference<"mutation">("native:shorthand"), {}),
  ).toBeNull();
  expect(
    await t.action(makeFunctionReference<"action">("native:argsOnly"), {
      text: "hello",
    }),
  ).toBe("HELLO");
  expect(
    await t.query(makeFunctionReference<"query">("native:objectValidator"), {
      text: "hello",
    }),
  ).toEqual({ text: "hello" });
});

test("platform opt-ins preserve typed contexts and Convex ID arguments", async () => {
  const create = internalMutation({
    platforms: ["api"],
    args: { text: v.string() },
    returns: v.id("todos"),
    handler: (ctx, { text }) =>
      ctx.db.insert("todos", { text, userId: "user_test", orgId: "org_test" }),
  });
  const lookup = internalQuery({
    platforms: ["api"],
    args: { id: v.id("todos") },
    returns: v.union(v.string(), v.null()),
    handler: async (ctx, { id }) => (await ctx.db.get(id))?.text ?? null,
  });
  const t = convexTest(schema, {
    "../convex/_generated/server.ts": () =>
      import("../convex/_generated/server"),
    "../convex/typed.ts": async () => ({ create, lookup }),
  });
  const id = await t.mutation(
    makeFunctionReference<"mutation">("typed:create"),
    { text: "hello" },
  );
  expect(
    await t.query(makeFunctionReference<"query">("typed:lookup"), { id }),
  ).toBe("hello");
});

test("native generic inference retains argument, context, and return constraints", () => {
  internalQuery({
    platforms: ["api"],
    args: { id: v.id("todos") },
    handler: (ctx, { id }) => {
      expectTypeOf(id).toEqualTypeOf<Id<"todos">>();
      // @ts-expect-error Query contexts cannot write to the database.
      ctx.db.insert("todos", { text: "bad", userId: "user", orgId: "org" });
      // @ts-expect-error A plain string is not a Convex ID.
      ctx.db.get("plain-string");
      return null;
    },
  });
  internalAction({
    args: { text: v.string() },
    handler: (ctx, { text }) => {
      expectTypeOf(text).toEqualTypeOf<string>();
      // @ts-expect-error Inferred string arguments have no numeric methods.
      text.toFixed();
      // @ts-expect-error Actions have no direct database access.
      void ctx.db;
      return null;
    },
  });
  internalQuery({
    returns: v.string(),
    // @ts-expect-error Handler return values must match their validator.
    handler: () => 123,
  });
  internalQuery({
    // @ts-expect-error Only API and MCP are valid transport platforms.
    platforms: ["web"],
    handler: () => null,
  });
});
