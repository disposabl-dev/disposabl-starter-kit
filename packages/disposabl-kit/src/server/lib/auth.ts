import { AuthKit } from "@convex-dev/workos-authkit";
import type { GenericDataModel, GenericQueryCtx } from "convex/server";
import { ConvexError, v } from "convex/values";

// Only authenticated entrypoints supply these fields to internal functions.
export const identityFields = {
  orgId: v.string(),
  userId: v.string(),
  role: v.union(v.literal("admin"), v.literal("member")),
};

export function createAuth<DataModel extends GenericDataModel>(
  component: AuthKit<DataModel>["component"],
  options: NonNullable<ConstructorParameters<typeof AuthKit<DataModel>>[1]> & {
    clientId: string;
    apiKey: string;
    webhookSecret: string;
  },
) {
  let authKit: AuthKit<DataModel> | undefined;
  const authkit = () =>
    (authKit ??= new AuthKit<DataModel>(component, options));
  const requireUser = async (ctx: Pick<GenericQueryCtx<DataModel>, "auth">) => {
    const identity = await ctx.auth.getUserIdentity().catch(() => null);
    if (!identity)
      throw new ConvexError({ code: "unauthenticated", status: 401 });
    if (
      ![
        "https://api.workos.com/",
        `https://api.workos.com/user_management/${options.clientId}`,
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
  const requireApiKey = async (request: Request) => {
    const value = request.headers
      .get("authorization")
      ?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!value) throw new ConvexError({ code: "unauthenticated", status: 401 });

    try {
      const workos = authkit().workos;
      const { apiKey } = await workos.apiKeys.createValidation({ value });
      if (!apiKey)
        throw new ConvexError({ code: "invalid_api_key", status: 401 });
      if (apiKey.owner.type !== "user")
        throw new ConvexError({ code: "user_api_key_required", status: 403 });
      if (!apiKey.permissions.includes("api:access"))
        throw new ConvexError({ code: "api_permission_required", status: 403 });

      const userId = apiKey.owner.id;
      const orgId = apiKey.owner.organizationId;
      if (!userId.startsWith("user_") || !orgId.startsWith("org_"))
        throw new ConvexError({ code: "invalid_api_key", status: 401 });
      const { data } = await workos.userManagement.listOrganizationMemberships({
        userId,
        organizationId: orgId,
        statuses: ["active"],
        limit: 1,
      });
      const membership = data[0];
      if (!membership)
        throw new ConvexError({
          code: "active_membership_required",
          status: 403,
        });
      const roles = (membership.roles ?? [membership.role]).map(
        (role) => role.slug,
      );
      const role: "admin" | "member" | null = roles.includes("admin")
        ? "admin"
        : roles.includes("member")
          ? "member"
          : null;
      if (!role) throw new ConvexError({ code: "role_required", status: 403 });
      return { orgId, userId, role };
    } catch (error) {
      if (error instanceof ConvexError) throw error;
      const status =
        error && typeof error === "object" && "status" in error
          ? error.status
          : undefined;
      if (status === 401 || status === 403 || status === 422)
        throw new ConvexError({ code: "invalid_api_key", status: 401 });
      throw new ConvexError({
        code: "identity_provider_unavailable",
        status: 503,
      });
    }
  };
  return { authkit, requireUser, requireApiKey, identityFields };
}
