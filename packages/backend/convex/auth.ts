import { AuthKit } from "@convex-dev/workos-authkit";
import { components } from "./_generated/api";
import { env, type QueryCtx } from "./_generated/server";
import type { DataModel } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";

let authKit: AuthKit<DataModel> | undefined;
export const getAuthKit = () =>
  (authKit ??= new AuthKit<DataModel>(components.workOSAuthKit, {
    clientId: env.WORKOS_CLIENT_ID,
    apiKey: env.WORKOS_API_KEY,
    webhookSecret: env.WORKOS_WEBHOOK_SECRET,
  }));

export const requireUser = async (ctx: Pick<QueryCtx, "auth">) => {
  const identity = await ctx.auth.getUserIdentity().catch(() => null);
  if (!identity)
    throw new ConvexError({ code: "unauthenticated", status: 401 });
  if (
    ![
      "https://api.workos.com/",
      `https://api.workos.com/user_management/${env.WORKOS_CLIENT_ID}`,
    ].includes(identity.issuer)
  )
    throw new ConvexError({ code: "session_required", status: 403 });
  const userId = identity.subject;
  const orgId = identity.org_id;
  if (typeof userId !== "string" || !userId.startsWith("user_"))
    throw new ConvexError({ code: "user_required", status: 403 });
  if (typeof orgId !== "string" || !orgId.startsWith("org_"))
    throw new ConvexError({ code: "organization_required", status: 403 });
  const roles = Array.isArray(identity.roles)
    ? identity.roles
    : [identity.role];
  const role: "admin" | "member" | null = roles.includes("admin")
    ? "admin"
    : roles.includes("member")
      ? "member"
      : null;
  if (!role) throw new ConvexError({ code: "role_required", status: 403 });
  return { orgId, userId, role };
};

// Authentication resolves these required fields before invoking internal functions.
export const identityFields = {
  orgId: v.string(),
  userId: v.string(),
  role: v.union(v.literal("admin"), v.literal("member")),
};
