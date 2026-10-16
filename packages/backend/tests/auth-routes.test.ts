import { expect, test, vi } from "vitest";
import { httpRouter } from "convex/server";
import {
  ConflictException,
  NotFoundException,
  SignatureVerificationException,
  type WorkOS,
} from "@workos-inc/node";
import { createAuth } from "disposabl-kit/server/lib";
import { components } from "../convex/_generated/api";

function setup(apiAccess?: { permissionSlug: string }) {
  const event = {
    id: "event_test",
    event: "user.created",
    data: { id: "user_test" },
    createdAt: "2026-10-16",
  };
  const workos = {
    webhooks: { constructEvent: vi.fn().mockResolvedValue(event) },
    authorization: {
      getPermission: vi.fn().mockResolvedValue({}),
      createPermission: vi.fn().mockResolvedValue({}),
      getEnvironmentRole: vi.fn().mockResolvedValue({
        permissions: ["api:access", "widgets:api-keys:manage"],
      }),
      addEnvironmentRolePermission: vi.fn(),
    },
    organizations: {
      getOrganizationByExternalId: vi
        .fn()
        .mockResolvedValue({ id: "org_test" }),
      createOrganization: vi.fn().mockResolvedValue({ id: "org_test" }),
    },
    userManagement: {
      getUser: vi.fn().mockResolvedValue({ id: "user_test" }),
      listOrganizationMemberships: vi.fn().mockResolvedValue({
        data: [] as { status: string; role?: { slug: string } }[],
      }),
      createOrganizationMembership: vi.fn().mockResolvedValue({}),
    },
  };
  const auth = createAuth(components.workOSAuthKit, {
    clientId: "client_test",
    apiKey: "sk_test",
    webhookSecret: "test",
    siteUrl: "https://test.convex.site",
    webhookPath: "/custom-webhook",
    apiAccess,
  });
  auth.authkit().workos = workos as unknown as WorkOS;
  const http = httpRouter();
  auth.registerRoutes(http);
  const ctx = {
    runQuery: vi.fn().mockResolvedValue(null),
    runMutation: vi.fn(),
  };
  const handler = http.lookup("/custom-webhook", "POST")![0] as unknown as {
    _handler(ctx: unknown, request: Request): Promise<Response>;
  };
  const invoke = () =>
    handler._handler(
      ctx,
      new Request("https://test.convex.site/custom-webhook", {
        method: "POST",
        body: "{}",
        headers: { "workos-signature": "test" },
      }),
    );
  return { workos, ctx, invoke, event, auth };
}

test.each([
  new SignatureVerificationException("invalid"),
  new SyntaxError("invalid"),
])(
  "rejects invalid webhook signatures or JSON before provisioning",
  async (error) => {
    const { workos, ctx, invoke } = setup();
    workos.webhooks.constructEvent.mockRejectedValue(error);
    expect((await invoke()).status).toBe(400);
    expect(workos.authorization.getPermission).not.toHaveBeenCalled();
    expect(ctx.runMutation).not.toHaveBeenCalled();
  },
);

test.each(["inactive", "pending"])(
  "does not reactivate %s memberships on webhook replay",
  async (status) => {
    const { workos, ctx, invoke, event } = setup();
    workos.userManagement.listOrganizationMemberships.mockResolvedValue({
      data: [{ status }],
    });
    expect((await invoke()).status).toBe(200);
    expect(
      workos.userManagement.listOrganizationMemberships,
    ).toHaveBeenCalledWith({
      userId: "user_test",
      organizationId: "org_test",
      statuses: ["active", "inactive", "pending"],
      limit: 1,
    });
    expect(
      workos.userManagement.createOrganizationMembership,
    ).not.toHaveBeenCalled();
    expect(ctx.runMutation).toHaveBeenCalledWith(
      components.workOSAuthKit.lib.onWebhookEvent,
      { event },
    );
  },
);

test("a provisioning failure prevents synchronization so webhook delivery can retry", async () => {
  const { workos, ctx, invoke } = setup();
  workos.userManagement.createOrganizationMembership.mockRejectedValue(
    new Error("unavailable"),
  );
  await expect(invoke()).rejects.toThrow("unavailable");
  expect(ctx.runMutation).not.toHaveBeenCalled();
});

test("creates permissions and personal membership before synchronizing", async () => {
  const { workos, ctx, invoke } = setup();
  workos.authorization.getEnvironmentRole.mockResolvedValue({
    permissions: [],
  });
  expect((await invoke()).status).toBe(200);
  expect(workos.authorization.addEnvironmentRolePermission.mock.calls).toEqual([
    ["admin", { permissionSlug: "api:access" }],
    ["admin", { permissionSlug: "widgets:api-keys:manage" }],
  ]);
  expect(
    workos.userManagement.createOrganizationMembership,
  ).toHaveBeenCalledWith({
    userId: "user_test",
    organizationId: "org_test",
    roleSlug: "admin",
  });
  expect(
    workos.userManagement.createOrganizationMembership.mock
      .invocationCallOrder[0],
  ).toBeLessThan(ctx.runMutation.mock.invocationCallOrder[0]!);
});

test("recovers concurrent organization creation by refetching without skipping membership", async () => {
  const { workos, ctx, invoke } = setup();
  workos.organizations.getOrganizationByExternalId.mockRejectedValueOnce(
    new NotFoundException({ path: "test", requestID: "test" }),
  );
  workos.organizations.createOrganization.mockRejectedValue(
    new ConflictException({ requestID: "test" }),
  );
  expect((await invoke()).status).toBe(200);
  expect(
    workos.organizations.getOrganizationByExternalId,
  ).toHaveBeenCalledTimes(2);
  expect(
    workos.userManagement.createOrganizationMembership,
  ).toHaveBeenCalledOnce();
  expect(ctx.runMutation).toHaveBeenCalledOnce();
});

test("validates API keys against the configured permission slug", async () => {
  const { auth, workos, invoke } = setup({ permissionSlug: "custom:access" });
  const createValidation = vi.fn().mockResolvedValue({
    apiKey: {
      owner: { type: "user", id: "user_test", organizationId: "org_test" },
      permissions: ["custom:access"],
    },
  });
  Object.assign(workos, { apiKeys: { createValidation } });
  const membership = {
    status: "active",
    role: { slug: "admin" },
  };
  workos.userManagement.listOrganizationMemberships.mockResolvedValue({
    data: [membership],
  });
  const request = new Request(
    "https://test.convex.site/api/v1/account/getAccount",
    {
      headers: { authorization: "Bearer sk_custom" },
    },
  );
  await expect(auth.requireApiUser(request)).resolves.toEqual({
    userId: "user_test",
    orgId: "org_test",
    role: "admin",
  });
  expect(createValidation).toHaveBeenCalledWith({ value: "sk_custom" });
  createValidation.mockResolvedValue({
    apiKey: {
      owner: { type: "user", id: "user_test", organizationId: "org_test" },
      permissions: ["api:access"],
    },
  });
  await expect(auth.requireApiUser(request)).rejects.toMatchObject({
    data: { code: "api_permission_required", status: 403 },
  });
  expect((await invoke()).status).toBe(200);
  expect(
    workos.authorization.addEnvironmentRolePermission,
  ).toHaveBeenCalledWith("admin", { permissionSlug: "custom:access" });
});
