import {
  NotFoundException,
  type Invitation,
  type Organization,
  type OrganizationMembership,
} from "@workos-inc/node";
import { defineWorkflow } from "@convex-dev/workflow";
import { ConvexError, v } from "convex/values";
import { components, internal } from "@disposabl/backend/_generated/api";
import {
  env,
  internalAction as nativeAction,
} from "@disposabl/backend/_generated/server";
import { authKit } from "@disposabl/disposabl-kit/server/auth";
import {
  identityFields,
  internalAction,
  internalQuery,
} from "@disposabl/disposabl-kit/server/lib/functions";
import { paginateWorkOS } from "@disposabl/disposabl-kit/server/lib/paginate-workos";
import {
  account,
  accountPage,
  role,
  pagination,
  member,
  memberPage,
  invitation,
  invitationPage,
} from "@disposabl/disposabl-kit/server/account/validators";

const requireTeams = () => {
  if (env.TEAMS_ENABLED !== "true")
    throw new ConvexError({ code: "teams_disabled", status: 403 });
};

async function requireTeamAdmin(orgId: string, currentRole: string) {
  requireTeams();
  if (currentRole !== "admin")
    throw new ConvexError({ code: "forbidden", status: 403 });
  const workos = authKit.workos;
  const org = await workos.organizations.getOrganization(orgId);
  if (org.externalId?.startsWith("personal:"))
    throw new ConvexError({ code: "personal_account", status: 403 });
  return workos;
}

function membershipRole(membership: OrganizationMembership) {
  const roles = (membership.roles ?? [membership.role]).map(
    (role) => role.slug,
  );
  if (roles.includes("admin")) return "admin" as const;
  if (roles.includes("member")) return "member" as const;
  throw new ConvexError({ code: "role_required", status: 403 });
}

async function editableMembership(
  orgId: string,
  userId: string,
  membershipId: string,
) {
  const membership =
    await authKit.workos.userManagement.getOrganizationMembership(membershipId);
  if (membership.organizationId !== orgId || membership.status !== "active")
    throw new ConvexError({ code: "not_found", status: 404 });
  if (membership.userId === userId)
    throw new ConvexError({ code: "admin_membership_protected", status: 403 });
  if (membership.directoryManaged)
    throw new ConvexError({ code: "directory_managed", status: 403 });
  return membership;
}

async function requirePendingInvitation(orgId: string, invitationId: string) {
  const invite =
    await authKit.workos.userManagement.getInvitation(invitationId);
  if (invite.organizationId !== orgId)
    throw new ConvexError({ code: "not_found", status: 404 });
  if (invite.state !== "pending")
    throw new ConvexError({ code: "invitation_not_pending", status: 400 });
}

export const getAccount = internalQuery({
  platforms: ["api", "mcp"],
  args: identityFields,
  returns: v.object(identityFields),
  handler: (_ctx, { orgId, userId, role }) => ({ orgId, userId, role }),
});

export const updateAccount = internalAction({
  platforms: ["api", "mcp"],
  args: { ...identityFields, name: v.string() },
  returns: account,
  handler: async (_ctx, { orgId, role, name }) => {
    requireTeams();
    if (role !== "admin")
      throw new ConvexError({ code: "forbidden", status: 403 });
    name = name.trim();
    if (!name || name.length > 100)
      throw new ConvexError({ code: "invalid_name", status: 400 });
    const workos = authKit.workos;
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
  const role = membershipRole(membership);
  org ??= await authKit.workos.organizations.getOrganization(
    membership.organizationId,
  );
  const personal = org.externalId?.startsWith("personal:") ?? false;
  if (personal && org.externalId !== `personal:${membership.userId}`)
    throw new ConvexError({ code: "forbidden", status: 403 });
  return { id: org.id, name: org.name, personal, role };
}

export const listTeams = internalAction({
  platforms: ["api", "mcp"],
  args: { ...identityFields, ...pagination.fields },
  returns: accountPage,
  handler: async (_ctx, { userId, paginationOpts }) => {
    requireTeams();
    const workos = authKit.workos;
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

export const createTeam = internalAction({
  platforms: ["api", "mcp"],
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
    const workos = authKit.workos;
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

export const listMembers = internalAction({
  platforms: ["api", "mcp"],
  args: { ...identityFields, ...pagination.fields },
  returns: memberPage,
  handler: async (_ctx, { orgId, ...args }) => {
    requireTeams();
    const result = await paginateWorkOS(args.paginationOpts, (opts) =>
      authKit.workos.userManagement.listOrganizationMemberships({
        organizationId: orgId,
        statuses: ["active"],
        ...opts,
      }),
    );
    return {
      ...result,
      page: result.page.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: membershipRole(m),
      })),
    };
  },
});

export const updateMemberRole = internalAction({
  platforms: ["api", "mcp"],
  args: { ...identityFields, membershipId: v.string(), roleSlug: role },
  returns: member,
  handler: async (_ctx, { orgId, userId, role, ...args }) => {
    const workos = await requireTeamAdmin(orgId, role);
    const m = await editableMembership(orgId, userId, args.membershipId);
    const updated = await workos.userManagement.updateOrganizationMembership(
      m.id,
      {
        roleSlug: args.roleSlug,
      },
    );
    return {
      id: updated.id,
      userId: updated.userId,
      role: membershipRole(updated),
    };
  },
});

export const removeMember = internalAction({
  platforms: ["api", "mcp"],
  args: { ...identityFields, membershipId: v.string() },
  returns: v.null(),
  handler: async (_ctx, { orgId, userId, role, ...args }) => {
    const workos = await requireTeamAdmin(orgId, role);
    const m = await editableMembership(orgId, userId, args.membershipId);
    await workos.userManagement.deleteOrganizationMembership(m.id);
    return null;
  },
});
function invitationResult(i: Invitation) {
  return { id: i.id, email: i.email, state: i.state, expiresAt: i.expiresAt };
}

export const listInvitations = internalAction({
  platforms: ["api", "mcp"],
  args: { ...identityFields, ...pagination.fields },
  returns: invitationPage,
  handler: async (_ctx, { orgId, role, ...args }) => {
    const workos = await requireTeamAdmin(orgId, role);
    const result = await paginateWorkOS(args.paginationOpts, (opts) =>
      workos.userManagement.listInvitations({
        organizationId: orgId,
        ...opts,
      }),
    );
    return { ...result, page: result.page.map(invitationResult) };
  },
});

export const sendInvitation = internalAction({
  platforms: ["api", "mcp"],
  args: { ...identityFields, email: v.string(), roleSlug: v.optional(role) },
  returns: invitation,
  handler: async (_ctx, { orgId, userId, role, ...args }) => {
    const workos = await requireTeamAdmin(orgId, role);
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

export const resendInvitation = internalAction({
  platforms: ["api", "mcp"],
  args: { ...identityFields, invitationId: v.string() },
  returns: invitation,
  handler: async (_ctx, { orgId, role, ...args }) => {
    const workos = await requireTeamAdmin(orgId, role);
    await requirePendingInvitation(orgId, args.invitationId);
    return invitationResult(
      await workos.userManagement.resendInvitation(args.invitationId),
    );
  },
});

export const revokeInvitation = internalAction({
  platforms: ["api", "mcp"],
  args: { ...identityFields, invitationId: v.string() },
  returns: invitation,
  handler: async (_ctx, { orgId, role, ...args }) => {
    const workos = await requireTeamAdmin(orgId, role);
    await requirePendingInvitation(orgId, args.invitationId);
    return invitationResult(
      await workos.userManagement.revokeInvitation(args.invitationId),
    );
  },
});

async function getOrCreate<T>(
  find: () => Promise<T | null>,
  create: () => Promise<T>,
): Promise<T> {
  const existing = await find();
  if (existing) return existing;

  try {
    return await create();
  } catch (error) {
    // Another worker may have created it, or the response may have been lost.
    const existing = await find();
    if (existing) return existing;
    throw error;
  }
}

export const provisionPersonalOrganization = defineWorkflow(
  components.workflow,
  {
    args: { userId: v.string() },
    returns: v.union(v.string(), v.null()),
  },
).handler(async (step, args): Promise<string | null> =>
  step.runAction(internal.disposabl.createPersonalOrganization, args, {
    retry: true,
  }),
);

// No organization exists yet, so this action has no platform identity arguments.
export const createPersonalOrganization = nativeAction({
  args: { userId: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (_ctx, { userId }): Promise<string | null> => {
    const workos = authKit.workos;
    // A queued event can outlive the user who triggered it.
    try {
      await workos.userManagement.getUser(userId);
    } catch (error) {
      if (error instanceof NotFoundException) return null;
      throw error;
    }

    const externalId = `personal:${userId}`;
    const organization = await getOrCreate(
      async () => {
        try {
          return await workos.organizations.getOrganizationByExternalId(
            externalId,
          );
        } catch (error) {
          if (error instanceof NotFoundException) return null;
          throw error;
        }
      },
      () =>
        workos.organizations.createOrganization({
          name: "Personal",
          externalId,
        }),
    );

    const membership = await getOrCreate(
      async () => {
        const { data } =
          await workos.userManagement.listOrganizationMemberships({
            organizationId: organization.id,
            userId,
            statuses: ["active", "inactive", "pending"],
            limit: 1,
          });
        return data[0] ?? null;
      },
      () =>
        workos.userManagement.createOrganizationMembership({
          organizationId: organization.id,
          userId,
          roleSlug: "admin",
        }),
    );

    if (
      membership.status !== "active" ||
      ![membership.role, ...(membership.roles ?? [])].some(
        (role) => role.slug === "admin",
      )
    ) {
      throw new Error(
        "Personal organization requires an active admin membership",
      );
    }

    return organization.id;
  },
});
