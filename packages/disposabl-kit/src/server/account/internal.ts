import type { AuthKit } from "@convex-dev/workos-authkit";
import type {
  Invitation,
  Organization,
  OrganizationMembership,
} from "@workos-inc/node";
import type { GenericDataModel } from "convex/server";
import { identityFields, paginateWorkOS, type InternalFunctions } from "../lib";
import { ConvexError, v } from "convex/values";
import {
  account,
  accountPage,
  role,
  pagination,
  member,
  memberPage,
  invitation,
  invitationPage,
} from "./validators";

/** Register with the app's generated internal builders. Identity arguments must come from trusted server entrypoints. */
export function createAccountFunctions<DataModel extends GenericDataModel>({
  internalAction,
  internalQuery,
  authkit,
  teamsEnabled = false,
}: {
  internalAction: InternalFunctions<DataModel>["internalAction"];
  internalQuery: InternalFunctions<DataModel>["internalQuery"];
  authkit: () => Pick<AuthKit<DataModel>, "workos">;
  teamsEnabled?: boolean;
}) {
  const requireTeams = () => {
    if (!teamsEnabled)
      throw new ConvexError({ code: "teams_disabled", status: 403 });
  };

  const getAccount = internalQuery({
    platforms: { api: true, cli: true, mcp: true, sdk: true },
    args: identityFields,
    returns: v.object(identityFields),
    handler: (_ctx, { orgId, userId, role }) => ({ orgId, userId, role }),
  });

  const updateAccount = internalAction({
    platforms: { api: true, cli: true, mcp: true, sdk: true },
    args: { ...identityFields, name: v.string() },
    returns: account,
    handler: async (_ctx, { orgId, role, name }) => {
      requireTeams();
      if (role !== "admin")
        throw new ConvexError({ code: "forbidden", status: 403 });
      name = name.trim();
      if (!name || name.length > 100)
        throw new ConvexError({ code: "invalid_name", status: 400 });
      const workos = authkit().workos;
      const current = await workos.organizations.getOrganization(orgId);
      if (current.externalId?.startsWith("personal:"))
        throw new ConvexError({ code: "personal_account", status: 403 });
      const org = await workos.organizations.updateOrganization({
        organization: orgId,
        name,
      });
      return { id: org.id, name: org.name, personal: false, role };
    },
  });

  async function accountResult(
    membership: OrganizationMembership,
    org?: Organization,
  ) {
    if (membership.status !== "active")
      throw new ConvexError({ code: "forbidden", status: 403 });
    const roles = (membership.roles ?? [membership.role]).map(
      (role) => role.slug,
    );
    const role = roles.includes("admin")
      ? ("admin" as const)
      : roles.includes("member")
        ? ("member" as const)
        : null;
    if (!role) throw new ConvexError({ code: "role_required", status: 403 });
    org ??= await authkit().workos.organizations.getOrganization(
      membership.organizationId,
    );
    const personal = org.externalId?.startsWith("personal:") ?? false;
    if (personal && org.externalId !== `personal:${membership.userId}`)
      throw new ConvexError({ code: "forbidden", status: 403 });
    return { id: org.id, name: org.name, personal, role };
  }

  const listTeams = internalAction({
    platforms: { api: true, cli: true, mcp: true, sdk: true },
    args: { ...identityFields, ...pagination.fields },
    returns: accountPage,
    handler: async (_ctx, { userId, paginationOpts }) => {
      requireTeams();
      const workos = authkit().workos;
      const result = await paginateWorkOS(paginationOpts, (opts) =>
        workos.userManagement.listOrganizationMemberships({
          userId,
          statuses: ["active"],
          ...opts,
        }),
      );
      const page = await Promise.all(
        result.page.map((membership) => accountResult(membership)),
      );
      return { ...result, page };
    },
  });

  const createTeam = internalAction({
    platforms: { api: true, cli: true, mcp: true, sdk: true },
    args: { ...identityFields, name: v.string(), requestId: v.string() },
    returns: account,
    handler: async (_ctx, { userId, name, requestId }) => {
      requireTeams();
      name = name.trim();
      if (!name || name.length > 100)
        throw new ConvexError({ code: "invalid_name", status: 400 });
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          requestId,
        )
      )
        throw new ConvexError({ code: "invalid_request_id", status: 400 });
      const workos = authkit().workos;
      const org = await workos.organizations.createOrganization(
        { name },
        { idempotencyKey: `team:${userId}:${requestId}` },
      );
      const { data } = await workos.userManagement.listOrganizationMemberships({
        userId,
        organizationId: org.id,
        statuses: ["active", "inactive", "pending"],
        limit: 1,
      });
      const membership =
        data[0] ??
        (await workos.userManagement.createOrganizationMembership({
          userId,
          organizationId: org.id,
          roleSlug: "admin",
        }));
      return accountResult(membership, org);
    },
  });

  const listMembers = internalAction({
    platforms: { api: true, cli: true, mcp: true, sdk: true },
    args: { ...identityFields, ...pagination.fields },
    returns: memberPage,
    handler: async (_ctx, { orgId, ...args }) => {
      requireTeams();
      const result = await paginateWorkOS(args.paginationOpts, (opts) =>
        authkit().workos.userManagement.listOrganizationMemberships({
          organizationId: orgId,
          statuses: ["active"],
          ...opts,
        }),
      );
      return {
        ...result,
        page: result.page.map((m) => {
          const roles = (m.roles ?? [m.role]).map((r) => r.slug);
          const role = roles.includes("admin")
            ? ("admin" as const)
            : roles.includes("member")
              ? ("member" as const)
              : null;
          if (!role)
            throw new ConvexError({ code: "role_required", status: 403 });
          return { id: m.id, userId: m.userId, role };
        }),
      };
    },
  });

  const updateMemberRole = internalAction({
    platforms: { api: true, cli: true, mcp: true, sdk: true },
    args: { ...identityFields, membershipId: v.string(), roleSlug: role },
    returns: member,
    handler: async (_ctx, { orgId, userId, role, ...args }) => {
      requireTeams();
      if (role !== "admin")
        throw new ConvexError({ code: "forbidden", status: 403 });
      const workos = authkit().workos;
      const org = await workos.organizations.getOrganization(orgId);
      if (org.externalId?.startsWith("personal:"))
        throw new ConvexError({ code: "personal_account", status: 403 });
      const m = await workos.userManagement.getOrganizationMembership(
        args.membershipId,
      );
      if (m.organizationId !== orgId || m.status !== "active")
        throw new ConvexError({ code: "not_found", status: 404 });
      if (m.userId === userId)
        throw new ConvexError({
          code: "admin_membership_protected",
          status: 403,
        });
      if (m.directoryManaged)
        throw new ConvexError({ code: "directory_managed", status: 403 });
      const updated = await workos.userManagement.updateOrganizationMembership(
        m.id,
        {
          roleSlug: args.roleSlug,
        },
      );
      const roles = (updated.roles ?? [updated.role]).map((r) => r.slug);
      const updatedRole = roles.includes("admin")
        ? ("admin" as const)
        : roles.includes("member")
          ? ("member" as const)
          : null;
      if (!updatedRole)
        throw new ConvexError({ code: "role_required", status: 403 });
      return { id: updated.id, userId: updated.userId, role: updatedRole };
    },
  });

  const removeMember = internalAction({
    platforms: { api: true, cli: true, mcp: true, sdk: true },
    args: { ...identityFields, membershipId: v.string() },
    returns: v.null(),
    handler: async (_ctx, { orgId, userId, role, ...args }) => {
      requireTeams();
      if (role !== "admin")
        throw new ConvexError({ code: "forbidden", status: 403 });
      const workos = authkit().workos;
      const org = await workos.organizations.getOrganization(orgId);
      if (org.externalId?.startsWith("personal:"))
        throw new ConvexError({ code: "personal_account", status: 403 });
      const m = await workos.userManagement.getOrganizationMembership(
        args.membershipId,
      );
      if (m.organizationId !== orgId || m.status !== "active")
        throw new ConvexError({ code: "not_found", status: 404 });
      if (m.userId === userId)
        throw new ConvexError({
          code: "admin_membership_protected",
          status: 403,
        });
      if (m.directoryManaged)
        throw new ConvexError({ code: "directory_managed", status: 403 });
      await workos.userManagement.deleteOrganizationMembership(m.id);
      return null;
    },
  });
  function invitationResult(i: Invitation) {
    return { id: i.id, email: i.email, state: i.state, expiresAt: i.expiresAt };
  }

  const listInvitations = internalAction({
    platforms: { api: true, cli: true, mcp: true, sdk: true },
    args: { ...identityFields, ...pagination.fields },
    returns: invitationPage,
    handler: async (_ctx, { orgId, role, ...args }) => {
      requireTeams();
      if (role !== "admin")
        throw new ConvexError({ code: "forbidden", status: 403 });
      const workos = authkit().workos;
      const org = await workos.organizations.getOrganization(orgId);
      if (org.externalId?.startsWith("personal:"))
        throw new ConvexError({ code: "personal_account", status: 403 });
      const result = await paginateWorkOS(args.paginationOpts, (opts) =>
        workos.userManagement.listInvitations({
          organizationId: orgId,
          ...opts,
        }),
      );
      return { ...result, page: result.page.map(invitationResult) };
    },
  });

  const sendInvitation = internalAction({
    platforms: { api: true, cli: true, mcp: true, sdk: true },
    args: { ...identityFields, email: v.string(), roleSlug: v.optional(role) },
    returns: invitation,
    handler: async (_ctx, { orgId, userId, role, ...args }) => {
      requireTeams();
      if (role !== "admin")
        throw new ConvexError({ code: "forbidden", status: 403 });
      const workos = authkit().workos;
      const org = await workos.organizations.getOrganization(orgId);
      if (org.externalId?.startsWith("personal:"))
        throw new ConvexError({ code: "personal_account", status: 403 });
      const email = args.email.trim().toLowerCase();
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new ConvexError({ code: "invalid_email", status: 400 });
      return invitationResult(
        await workos.userManagement.sendInvitation({
          email,
          roleSlug: args.roleSlug ?? "member",
          organizationId: orgId,
          inviterUserId: userId,
        }),
      );
    },
  });

  const resendInvitation = internalAction({
    platforms: { api: true, cli: true, mcp: true, sdk: true },
    args: { ...identityFields, invitationId: v.string() },
    returns: invitation,
    handler: async (_ctx, { orgId, role, ...args }) => {
      requireTeams();
      if (role !== "admin")
        throw new ConvexError({ code: "forbidden", status: 403 });
      const workos = authkit().workos;
      const org = await workos.organizations.getOrganization(orgId);
      if (org.externalId?.startsWith("personal:"))
        throw new ConvexError({ code: "personal_account", status: 403 });
      const invite = await workos.userManagement.getInvitation(
        args.invitationId,
      );
      if (invite.organizationId !== orgId)
        throw new ConvexError({ code: "not_found", status: 404 });
      if (invite.state !== "pending")
        throw new ConvexError({ code: "invitation_not_pending", status: 400 });
      return invitationResult(
        await workos.userManagement.resendInvitation(args.invitationId),
      );
    },
  });

  const revokeInvitation = internalAction({
    platforms: { api: true, cli: true, mcp: true, sdk: true },
    args: { ...identityFields, invitationId: v.string() },
    returns: invitation,
    handler: async (_ctx, { orgId, role, ...args }) => {
      requireTeams();
      if (role !== "admin")
        throw new ConvexError({ code: "forbidden", status: 403 });
      const workos = authkit().workos;
      const org = await workos.organizations.getOrganization(orgId);
      if (org.externalId?.startsWith("personal:"))
        throw new ConvexError({ code: "personal_account", status: 403 });
      const invite = await workos.userManagement.getInvitation(
        args.invitationId,
      );
      if (invite.organizationId !== orgId)
        throw new ConvexError({ code: "not_found", status: 404 });
      if (invite.state !== "pending")
        throw new ConvexError({ code: "invitation_not_pending", status: 400 });
      return invitationResult(
        await workos.userManagement.revokeInvitation(args.invitationId),
      );
    },
  });
  return {
    getAccount,
    updateAccount,
    listTeams,
    createTeam,
    listMembers,
    updateMemberRole,
    removeMember,
    listInvitations,
    sendInvitation,
    resendInvitation,
    revokeInvitation,
  };
}
