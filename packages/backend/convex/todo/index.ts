import { v, type Infer } from "convex/values";
import { env, mutation } from "../_generated/server";
import { requireUser } from "@disposabl/disposabl-kit/server";
import { internal } from "../_generated/api";

const createTodoResult = v.object({
  success: v.literal(true),
  message: v.string(),
  data: v.object({
    id: v.string(),
    title: v.string(),
    description: v.string(),
  }),
});

export const createTodo = mutation({
  args: {
    title: v.string(),
    description: v.string(),
  },
  returns: createTodoResult,
  handler: async (ctx, args): Promise<Infer<typeof createTodoResult>> => {
    const user = await requireUser(ctx, env.WORKOS_CLIENT_ID);
    return ctx.runMutation(internal.todo.internal.createTodo, {
      title: args.title,
      description: args.description,
      ...user,
    });
  },
});
