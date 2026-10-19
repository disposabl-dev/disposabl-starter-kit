import { withPlatforms } from "@disposabl/disposabl-kit/server/lib";
import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const createTodo = withPlatforms(
  internalMutation({
    args: {
      title: v.string(),
      description: v.string(),
    },
    returns: v.object({
      success: v.literal(true),
      message: v.string(),
      data: v.object({
        id: v.string(),
        title: v.string(),
        description: v.string(),
      }),
    }),
    handler: (_ctx, args) => ({
      success: true as const,
      message: "Todo created successfully",
      data: {
        id: "123",
        title: args.title,
        description: args.description,
      },
    }),
  }),
  ["api", "mcp"],
);
