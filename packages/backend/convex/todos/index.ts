import type { Doc, Id } from "../_generated/dataModel";
import { query, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireUser } from "../auth";
import { v } from "convex/values";
import schema from "../schema";
import {
  paginationOptsValidator,
  paginationResultValidator,
  type PaginationResult,
} from "convex/server";

export const createTodo = mutation({
  args: { text: v.string() },
  returns: v.id("todos"),
  handler: async (ctx, args): Promise<Id<"todos">> => {
    const { orgId, userId, role } = await requireUser(ctx);
    return ctx.runMutation(internal.todos.internal.createTodo, {
      orgId,
      userId,
      role,
      ...args,
    });
  },
});
export const listTodos = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(schema.doc("todos")),
  handler: async (ctx, args): Promise<PaginationResult<Doc<"todos">>> => {
    const { orgId, userId, role } = await requireUser(ctx);
    return ctx.runQuery(internal.todos.internal.listTodos, {
      orgId,
      userId,
      role,
      ...args,
    });
  },
});
export const deleteTodo = mutation({
  args: { id: v.id("todos") },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const { orgId, userId, role } = await requireUser(ctx);
    return ctx.runMutation(internal.todos.internal.deleteTodo, {
      orgId,
      userId,
      role,
      ...args,
    });
  },
});
