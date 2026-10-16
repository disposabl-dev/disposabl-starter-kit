import { query } from "../_generated/server";
import { requireUser } from "../auth";
import { internal } from "../_generated/api";
import type { AccountIdentity } from "./validator";

export const getAccount = query({
  args: {},
  handler: async (ctx): Promise<AccountIdentity> => {
    const user = await requireUser(ctx);
    return await ctx.runQuery(internal.account.internal.getAccount, {
      ...user,
    });
  },
});
