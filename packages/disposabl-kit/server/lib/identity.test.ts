import { describe, expect, test } from "bun:test";
import { ConvexError } from "convex/values";
import { userIdentity } from "./identity";

function expectIdentityError(run: () => unknown, code: string) {
  try {
    run();
  } catch (error) {
    if (!(error instanceof ConvexError)) throw error;
    expect(error.data).toEqual({ code, status: 403 });
    return;
  }
  throw new Error("Expected a ConvexError");
}

describe("userIdentity", () => {
  test.each(["admin", "member"] as const)(
    "returns a valid %s identity",
    (role) => {
      expect(userIdentity("user_123", "org_456", [role])).toEqual({
        userId: "user_123",
        orgId: "org_456",
        role,
      });
    },
  );

  test.each([
    ["member", "admin"],
    ["admin", "member"],
  ])("prefers admin regardless of role order: %j", (...roles) => {
    expect(userIdentity("user_123", "org_456", roles).role).toBe("admin");
  });

  test("ignores unsupported roles when a supported role is present", () => {
    const roles: readonly unknown[] = [null, 42, "owner", "member"];
    expect(userIdentity("user_123", "org_456", roles).role).toBe("member");
  });

  const invalidUserIds = [
    undefined,
    null,
    123,
    {},
    "",
    "org_123",
    "user_",
    "prefix_user_123",
  ];
  test.each(invalidUserIds)("rejects invalid user ID: %j", (userId) => {
    expectIdentityError(
      () => userIdentity(userId, "org_456", ["admin"]),
      "user_required",
    );
  });

  const invalidOrgIds = [
    undefined,
    null,
    123,
    {},
    "",
    "user_123",
    "org_",
    "prefix_org_456",
  ];
  test.each(invalidOrgIds)("rejects invalid organization ID: %j", (orgId) => {
    expectIdentityError(
      () => userIdentity("user_123", orgId, ["member"]),
      "organization_required",
    );
  });

  test.each([
    { roles: [] },
    { roles: ["owner"] },
    { roles: ["Admin", "MEMBER"] },
    { roles: [null, undefined, 42, {}] },
  ])("rejects missing or unsupported roles: %j", ({ roles }) => {
    expectIdentityError(
      () => userIdentity("user_123", "org_456", roles),
      "role_required",
    );
  });

  test("checks user, organization, then role", () => {
    expectIdentityError(
      () => userIdentity(undefined, undefined, []),
      "user_required",
    );
    expectIdentityError(
      () => userIdentity("user_123", undefined, []),
      "organization_required",
    );
  });
});
