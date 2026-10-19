import { ConvexError, v, type Infer } from "convex/values";
import { role } from "../account/validators";

export const identityFields = {
  orgId: v.string(),
  userId: v.string(),
  role,
};

export const accountIdentity = v.object(identityFields);
export type AccountIdentity = Infer<typeof accountIdentity>;

export function userIdentity(
  userId: unknown,
  orgId: unknown,
  roles: readonly unknown[],
): AccountIdentity {
  if (typeof userId !== "string" || !/^user_.+/.test(userId)) {
    throw new ConvexError({ code: "user_required", status: 403 });
  }
  if (typeof orgId !== "string" || !/^org_.+/.test(orgId)) {
    throw new ConvexError({ code: "organization_required", status: 403 });
  }

  const role = roles.includes("admin")
    ? "admin"
    : roles.includes("member")
      ? "member"
      : null;
  if (role === null) {
    throw new ConvexError({ code: "role_required", status: 403 });
  }

  return { userId, orgId, role };
}
