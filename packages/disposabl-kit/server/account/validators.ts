import type {
  Invitation,
  Organization,
  OrganizationMembership,
} from "@workos-inc/node";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v, type Validator } from "convex/values";

// WorkOS types are compile-time only. These small boundary schemas also generate OpenAPI.
export const role = v.union(v.literal("admin"), v.literal("member"));
export const account = v.object({
  id: v.string(),
  name: v.string(),
  personal: v.boolean(),
  role,
}) satisfies Validator<Pick<Organization, "id" | "name">, "required", string>;
export const pagination = v.object({ paginationOpts: paginationOptsValidator });
export const member = v.object({
  id: v.string(),
  userId: v.string(),
  role,
}) satisfies Validator<
  Pick<OrganizationMembership, "id" | "userId">,
  "required",
  string
>;
export const invitation = v.object({
  id: v.string(),
  email: v.string(),
  state: v.union(
    v.literal("pending"),
    v.literal("accepted"),
    v.literal("expired"),
    v.literal("revoked"),
  ),
  expiresAt: v.string(),
}) satisfies Validator<
  Pick<Invitation, "id" | "email" | "state" | "expiresAt">,
  "required",
  string
>;

export const accountPage = paginationResultValidator(account);
export const memberPage = paginationResultValidator(member);
export const invitationPage = paginationResultValidator(invitation);
