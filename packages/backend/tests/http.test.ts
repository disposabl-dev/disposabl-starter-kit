import { convexTest } from "convex-test";
import authKitComponent from "@convex-dev/workos-authkit/test";
import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
  WorkOS,
} from "@workos-inc/node";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import schema from "../convex/schema";
import { components } from "../convex/_generated/api";

const fixture = vi.hoisted(() => ({ workos: null as WorkOS | null }));
vi.mock("../convex/auth", () => ({
  getAuthKit: () => ({ workos: fixture.workos }),
}));
const modules = import.meta.glob("../convex/**/*.{ts,js}");
const secret = "whsec_fixture";
const rawUser = {
  object: "user",
  id: "user_fixture",
  email: "test@example.com",
  email_verified: true,
  first_name: "Test",
  last_name: "User",
  metadata: {},
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-10-01T00:00:00.000Z",
};

function init() {
  const t = convexTest(schema, modules);
  authKitComponent.register(t);
  return t;
}
function workos() {
  if (!fixture.workos) throw new Error("Missing fixture");
  return fixture.workos;
}
const notFound = () =>
  new NotFoundException({ path: "/fixture", requestID: "request_fixture" });
const organization = {
  id: "org_fixture",
  name: "Personal",
  externalId: "personal:user_fixture",
  object: "organization" as const,
  domains: [],
  allowProfilesOutsideOrganization: false,
  metadata: {},
  createdAt: rawUser.created_at,
  updatedAt: rawUser.updated_at,
};

async function webhook(
  payload = JSON.stringify({
    id: "event_fixture",
    event: "user.created",
    data: rawUser,
    created_at: rawUser.created_at,
  }),
) {
  const timestamp = String(Date.now());
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  const hex = Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return {
    method: "POST",
    body: payload,
    headers: { "workos-signature": `t=${timestamp},v1=${hex}` },
  };
}

beforeEach(() => {
  vi.stubEnv("WORKOS_WEBHOOK_SECRET", secret);
  fixture.workos ??= new WorkOS("sk_test_fixture");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("Unexpected network call in test"))),
  );
  vi.spyOn(workos().userManagement, "getUser").mockResolvedValue({
    id: rawUser.id,
  } as Awaited<ReturnType<WorkOS["userManagement"]["getUser"]>>);
  vi.spyOn(
    workos().organizations,
    "getOrganizationByExternalId",
  ).mockRejectedValue(notFound());
  vi.spyOn(workos().organizations, "createOrganization").mockResolvedValue(
    organization,
  );
  vi.spyOn(
    workos().userManagement,
    "listOrganizationMemberships",
  ).mockResolvedValue({ data: [] } as unknown as Awaited<
    ReturnType<WorkOS["userManagement"]["listOrganizationMemberships"]>
  >);
  vi.spyOn(
    workos().userManagement,
    "createOrganizationMembership",
  ).mockResolvedValue({ id: "om_fixture" } as Awaited<
    ReturnType<WorkOS["userManagement"]["createOrganizationMembership"]>
  >);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it.each(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])(
  "reserves API paths for %s instead of returning the SPA",
  async (method) => {
    const t = init();
    for (const path of ["/api", "/api/missing"]) {
      const response = await t.fetch(path, { method });
      expect(response.status).toBe(404);
      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
    }
  },
);

it("rejects missing, invalid, and expired webhook signatures before provisioning", async () => {
  const t = init();
  for (const signature of [
    "",
    "t=1,v1=invalid",
    `t=${Date.now()},v1=invalid`,
  ]) {
    const response = await t.fetch("/workos/webhook", {
      method: "POST",
      body: "{}",
      headers: { "workos-signature": signature },
    });
    expect(response.status).toBe(400);
  }
  expect(workos().userManagement.getUser).not.toHaveBeenCalled();
  expect(
    await t.query(components.workOSAuthKit.lib.getAuthUser, { id: rawUser.id }),
  ).toBeNull();
});

it("verifies signed events, provisions the personal organization, and skips duplicate provisioning", async () => {
  const t = init();
  expect((await t.fetch("/workos/webhook", await webhook())).status).toBe(200);
  expect(
    (
      await t.query(components.workOSAuthKit.lib.getAuthUser, {
        id: rawUser.id,
      })
    )?.email,
  ).toBe(rawUser.email);
  expect((await t.fetch("/workos/webhook", await webhook())).status).toBe(200);
  expect(workos().organizations.createOrganization).toHaveBeenCalledTimes(1);
  expect(
    workos().userManagement.createOrganizationMembership,
  ).toHaveBeenCalledWith({
    userId: rawUser.id,
    organizationId: organization.id,
    roleSlug: "admin",
  });
});

it("recovers organization and membership creation races by re-reading existing resources", async () => {
  const t = init();
  vi.mocked(workos().organizations.getOrganizationByExternalId)
    .mockRejectedValueOnce(notFound())
    .mockResolvedValue(organization);
  vi.mocked(workos().organizations.createOrganization).mockRejectedValueOnce(
    new ConflictException({ requestID: "req_fixture" }),
  );
  vi.mocked(
    workos().userManagement.createOrganizationMembership,
  ).mockRejectedValueOnce(
    new UnprocessableEntityException({ requestID: "req_fixture" }),
  );
  vi.mocked(workos().userManagement.listOrganizationMemberships)
    .mockResolvedValueOnce({ data: [] } as unknown as Awaited<
      ReturnType<WorkOS["userManagement"]["listOrganizationMemberships"]>
    >)
    .mockResolvedValue({ data: [{ id: "om_existing" }] } as unknown as Awaited<
      ReturnType<WorkOS["userManagement"]["listOrganizationMemberships"]>
    >);
  expect((await t.fetch("/workos/webhook", await webhook())).status).toBe(200);
  expect(
    await t.query(components.workOSAuthKit.lib.getAuthUser, { id: rawUser.id }),
  ).not.toBeNull();
});

it("leaves failed provisioning unsynced so delivery can retry", async () => {
  const t = init();
  vi.mocked(
    workos().userManagement.createOrganizationMembership,
  ).mockRejectedValueOnce(new Error("WorkOS unavailable"));
  await expect(t.fetch("/workos/webhook", await webhook())).rejects.toThrow(
    "WorkOS unavailable",
  );
  expect(
    await t.query(components.workOSAuthKit.lib.getAuthUser, { id: rawUser.id }),
  ).toBeNull();
  expect((await t.fetch("/workos/webhook", await webhook())).status).toBe(200);
});

it("does not swallow a membership validation failure when no membership exists", async () => {
  const t = init();
  vi.mocked(
    workos().userManagement.createOrganizationMembership,
  ).mockRejectedValueOnce(
    new UnprocessableEntityException({
      requestID: "req_fixture",
      message: "Invalid role",
    }),
  );
  await expect(t.fetch("/workos/webhook", await webhook())).rejects.toThrow(
    "Invalid role",
  );
  expect(
    await t.query(components.workOSAuthKit.lib.getAuthUser, { id: rawUser.id }),
  ).toBeNull();
});

it("does not recreate resources for a deleted WorkOS user", async () => {
  const t = init();
  vi.mocked(workos().userManagement.getUser).mockRejectedValueOnce(notFound());
  expect((await t.fetch("/workos/webhook", await webhook())).status).toBe(200);
  expect(workos().organizations.createOrganization).not.toHaveBeenCalled();
  expect(
    await t.query(components.workOSAuthKit.lib.getAuthUser, { id: rawUser.id }),
  ).toBeNull();
});

it.each(["inactive", "pending"])(
  "preserves %s membership access rather than reactivating it on a user event",
  async (status) => {
    const t = init();
    vi.mocked(
      workos().organizations.getOrganizationByExternalId,
    ).mockResolvedValue(organization);
    vi.mocked(
      workos().userManagement.listOrganizationMemberships,
    ).mockResolvedValue({
      data: [{ id: "om_existing", status }],
    } as unknown as Awaited<
      ReturnType<WorkOS["userManagement"]["listOrganizationMemberships"]>
    >);
    expect((await t.fetch("/workos/webhook", await webhook())).status).toBe(
      200,
    );
    expect(
      workos().userManagement.createOrganizationMembership,
    ).not.toHaveBeenCalled();
    expect(workos().organizations.createOrganization).not.toHaveBeenCalled();
  },
);
