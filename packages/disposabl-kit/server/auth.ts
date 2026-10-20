import { validate } from "convex-helpers/validators";
import { ConvexError, v } from "convex/values";
import { identityFields } from "@disposabl/disposabl-kit/server/lib/functions";
import type { Auth } from "convex/server";
import { AuthKit } from "@convex-dev/workos-authkit";
import { start } from "@convex-dev/workflow";
import { components, internal } from "@disposabl/backend/_generated/api";
import type { DataModel } from "@disposabl/backend/_generated/dataModel";

export const authKit: AuthKit<DataModel> = new AuthKit<DataModel>(
  components.workOSAuthKit,
  { authFunctions: internal.disposabl },
);

export const { authKitEvent } = authKit.events({
  "user.created": async (ctx, event) => {
    await start(ctx, internal.disposabl.provisionPersonalOrganization, {
      userId: event.data.id,
    });
  },
});

const identityValidator = v.object(identityFields);

export const requireUser = async (ctx: { auth: Auth }, clientId: string) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity)
    throw new ConvexError({ code: "unauthenticated", status: 401 });

  const roles = Array.isArray(identity.roles)
    ? identity.roles
    : [identity.role];

  const user = {
    userId: identity.subject,
    orgId: identity.org_id,
    role: roles.includes("admin")
      ? "admin"
      : roles.includes("member")
        ? "member"
        : null,
  };

  const issuers = [
    "https://api.workos.com/",
    `https://api.workos.com/user_management/${clientId}`,
  ];

  if (
    !issuers.includes(identity.issuer) ||
    !validate(identityValidator, user) ||
    !user.userId.startsWith("user_") ||
    !user.orgId?.toString().startsWith("org_")
  )
    throw new ConvexError({ code: "invalid_identity", status: 403 });

  return user;
};
