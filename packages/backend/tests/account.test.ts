import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
import type { WorkOS } from "@workos-inc/node";
import { createAccountFunctions } from "disposabl-kit/server/account";
import { internalAction, internalQuery } from "../convex/_generated/server";
import { internal } from "../convex/_generated/api";
import schema from "../convex/schema";

const identity = {
  orgId: "org_test",
  userId: "user_test",
  role: "admin" as const,
};
function setup(workos: unknown = {}, teamsEnabled: boolean | undefined = true) {
  const functions = createAccountFunctions({
    internalAction,
    internalQuery,
    teamsEnabled,
    authkit: () => ({ workos: workos as WorkOS }),
  });
  const modules = import.meta.glob("../convex/**/*.{js,ts}");
  modules["../convex/account/internal.ts"] = async () => functions;
  return { t: convexTest(schema, modules), functions };
}

test("registers every account operation as internal and returns trusted identity", async () => {
  const { t, functions } = setup();
  for (const fn of Object.values(functions)) {
    expect(fn).toHaveProperty("isInternal", true);
    expect(fn).not.toHaveProperty("isPublic", true);
  }
  expect(await t.query(internal.account.internal.getAccount, identity)).toEqual(
    identity,
  );
});

test("rejects member writes, personal account edits, and cross-organization membership edits", async () => {
  const update = vi.fn();
  const getOrganization = vi
    .fn()
    .mockResolvedValue({ externalId: "personal:user_test" });
  const { t } = setup({
    organizations: { getOrganization, updateOrganization: update },
    userManagement: {
      getOrganizationMembership: vi
        .fn()
        .mockResolvedValue({ organizationId: "org_other", status: "active" }),
      updateOrganizationMembership: update,
    },
  });
  await expect(
    t.action(internal.account.internal.updateAccount, {
      ...identity,
      role: "member",
      name: "Team",
    }),
  ).rejects.toThrow("forbidden");
  expect(getOrganization).not.toHaveBeenCalled();
  await expect(
    t.action(internal.account.internal.updateAccount, {
      ...identity,
      name: "Team",
    }),
  ).rejects.toThrow("personal_account");
  getOrganization.mockResolvedValue({ externalId: null });
  await expect(
    t.action(internal.account.internal.updateMemberRole, {
      ...identity,
      membershipId: "om_other",
      roleSlug: "member",
    }),
  ).rejects.toThrow("not_found");
  expect(update).not.toHaveBeenCalled();
});

test("creates a team idempotently from trusted internal identity without session auth", async () => {
  const createOrganization = vi
    .fn()
    .mockResolvedValue({ id: "org_new", name: "New team", externalId: null });
  const createOrganizationMembership = vi.fn().mockResolvedValue({
    id: "om_new",
    organizationId: "org_new",
    userId: identity.userId,
    status: "active",
    role: { slug: "admin" },
  });
  const { t } = setup({
    organizations: { createOrganization },
    userManagement: {
      listOrganizationMemberships: vi.fn().mockResolvedValue({ data: [] }),
      createOrganizationMembership,
    },
  });
  const requestId = "00000000-0000-0000-0000-000000000001";
  expect(
    await t.action(internal.account.internal.createTeam, {
      ...identity,
      name: " New team ",
      requestId,
    }),
  ).toEqual({
    id: "org_new",
    name: "New team",
    personal: false,
    role: "admin",
  });
  expect(createOrganization).toHaveBeenCalledWith(
    { name: "New team" },
    { idempotencyKey: `team:${identity.userId}:${requestId}` },
  );
  expect(createOrganizationMembership).toHaveBeenCalledWith({
    userId: identity.userId,
    organizationId: "org_new",
    roleSlug: "admin",
  });
});

test("bounds WorkOS pages and preserves cursors", async () => {
  const listOrganizationMemberships = vi
    .fn()
    .mockResolvedValue({ data: [], listMetadata: { after: "next" } });
  const { t } = setup({ userManagement: { listOrganizationMemberships } });
  await expect(
    t.action(internal.account.internal.listTeams, {
      ...identity,
      paginationOpts: { numItems: 101, cursor: null },
    }),
  ).rejects.toThrow("invalid_page_size");
  expect(listOrganizationMemberships).not.toHaveBeenCalled();
  expect(
    await t.action(internal.account.internal.listTeams, {
      ...identity,
      paginationOpts: { numItems: 10, cursor: "previous" },
    }),
  ).toEqual({ page: [], isDone: false, continueCursor: "next" });
  expect(listOrganizationMemberships).toHaveBeenCalledWith({
    userId: identity.userId,
    statuses: ["active"],
    limit: 10,
    after: "previous",
  });
});

test("disabling teams blocks every collaboration operation before contacting WorkOS", async () => {
  const { t } = setup({}, false);
  const page = { ...identity, paginationOpts: { numItems: 10, cursor: null } };
  const membership = { ...identity, membershipId: "om_test" };
  const invitation = { ...identity, invitationId: "inv_test" };
  const calls = [
    t.action(internal.account.internal.updateAccount, {
      ...identity,
      name: "Team",
    }),
    t.action(internal.account.internal.listTeams, page),
    t.action(internal.account.internal.createTeam, {
      ...identity,
      name: "Team",
      requestId: "00000000-0000-0000-0000-000000000001",
    }),
    t.action(internal.account.internal.listMembers, page),
    t.action(internal.account.internal.updateMemberRole, {
      ...membership,
      roleSlug: "member",
    }),
    t.action(internal.account.internal.removeMember, membership),
    t.action(internal.account.internal.listInvitations, page),
    t.action(internal.account.internal.sendInvitation, {
      ...identity,
      email: "member@example.com",
    }),
    t.action(internal.account.internal.resendInvitation, invitation),
    t.action(internal.account.internal.revokeInvitation, invitation),
  ];
  for (const result of await Promise.allSettled(calls)) {
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason.data).toEqual({
        code: "teams_disabled",
        status: 403,
      });
    }
  }
  expect(await t.query(internal.account.internal.getAccount, identity)).toEqual(
    identity,
  );
});

test("the shared factory defaults to teams disabled when the option is omitted", async () => {
  const functions = createAccountFunctions({
    internalAction,
    internalQuery,
    authkit: () => {
      throw new Error("WorkOS must not be contacted");
    },
  });
  const modules = import.meta.glob("../convex/**/*.{js,ts}");
  modules["../convex/account/internal.ts"] = async () => functions;
  const t = convexTest(schema, modules);
  await expect(
    t.action(internal.account.internal.listMembers, {
      ...identity,
      paginationOpts: { numItems: 10, cursor: null },
    }),
  ).rejects.toThrow("teams_disabled");
});
