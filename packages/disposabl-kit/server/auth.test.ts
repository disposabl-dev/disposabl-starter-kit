import { describe, expect, test } from "bun:test";
import type { Auth, UserIdentity } from "convex/server";
import { requireUser } from "./auth";

const clientId = "client_test";

function identity(claims: Partial<UserIdentity> = {}): UserIdentity {
  return {
    tokenIdentifier: "test-token",
    issuer: `https://api.workos.com/user_management/${clientId}`,
    subject: "user_test",
    org_id: "org_test",
    role: "member",
    ...claims,
  };
}

function context(userIdentity: UserIdentity | null): { auth: Auth } {
  return { auth: { getUserIdentity: async () => userIdentity } };
}

describe("requireUser", () => {
  test("rejects unauthenticated requests with 401", async () => {
    await expect(requireUser(context(null), clientId)).rejects.toMatchObject({
      data: { code: "unauthenticated", status: 401 },
    });
  });

  test.each([
    ["untrusted issuer", { issuer: "https://attacker.example/" }],
    [
      "another WorkOS client",
      { issuer: "https://api.workos.com/user_management/client_other" },
    ],
    ["invalid subject", { subject: "other_test" }],
    ["missing organization", { org_id: undefined }],
    ["invalid organization type", { org_id: 123 }],
    ["invalid organization prefix", { org_id: "other_test" }],
    ["missing role", { role: undefined }],
    ["unsupported role", { role: "owner" }],
    ["unsupported roles", { roles: ["owner"] }],
  ] satisfies [string, Partial<UserIdentity>][])(
    "rejects %s with 403",
    async (_name, claims) => {
      await expect(
        requireUser(context(identity(claims)), clientId),
      ).rejects.toMatchObject({
        data: { code: "invalid_identity", status: 403 },
      });
    },
  );

  test.each([
    ["member claim", {}, "member"],
    ["admin claim", { role: "admin" }, "admin"],
    ["member roles", { role: undefined, roles: ["member"] }, "member"],
    ["admin roles take precedence", { roles: ["member", "admin"] }, "admin"],
    ["legacy issuer", { issuer: "https://api.workos.com/" }, "member"],
  ] satisfies [string, Partial<UserIdentity>, "member" | "admin"][])(
    "accepts %s and returns only trusted identity fields",
    async (_name, claims, role) => {
      expect(await requireUser(context(identity(claims)), clientId)).toEqual({
        userId: "user_test",
        orgId: "org_test",
        role,
      });
    },
  );
});
