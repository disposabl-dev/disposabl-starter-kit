import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "../convex/schema";

test("stores and retrieves a todo by organization", async () => {
  const t = convexTest(schema, import.meta.glob("../convex/**/*.{js,ts}"));
  const todo = {
    text: "Test the backend",
    userId: "user_test",
    orgId: "org_test",
  };

  const id = await t.run((ctx) => ctx.db.insert("todos", todo));
  const saved = await t.run((ctx) =>
    ctx.db
      .query("todos")
      .withIndex("by_orgId", (q) => q.eq("orgId", todo.orgId))
      .unique(),
  );

  expect(saved).toMatchObject({ _id: id, ...todo });
});
