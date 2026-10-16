import { v } from "convex/values";
import { identityFields } from "../auth";
import { internalMutation, internalQuery } from "../lib/functions";

export const createTodo = internalMutation({
  platforms: ["api"],
  args: { ...identityFields, text: v.string() },
  returns: v.id("todos"),
  handler: async (ctx, { text, userId, orgId }) => {
    return await ctx.db.insert("todos", { text, userId, orgId });
  },
});

export const getTodo = internalQuery({
  platforms: ["mcp"],
  args: { ...identityFields, id: v.id("todos") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("todos"),
      _creationTime: v.number(),
      text: v.string(),
      userId: v.string(),
      orgId: v.string(),
    }),
  ),
  handler: async (ctx, { id, orgId }) => {
    const todo = await ctx.db.get("todos", id);
    return todo?.orgId === orgId ? todo : null;
  },
});
