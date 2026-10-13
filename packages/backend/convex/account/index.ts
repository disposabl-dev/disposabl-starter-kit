import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireUser } from "../auth";
import { internal } from "../_generated/api";

export const getAccount = query({
  args: {
    id: v.string(),
  },
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return ctx.runQuery(internal.account.internal.getAccount, { ...user });
  },
});
