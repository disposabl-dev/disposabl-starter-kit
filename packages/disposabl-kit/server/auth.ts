import { validate } from "convex-helpers/validators";
import { ConvexError, v, type ObjectType } from "convex/values";
import {
  createRemoteJWKSet,
  errors,
  jwtVerify,
  type JWTVerifyOptions,
} from "jose";
import { identityFields } from "@disposabl/disposabl-kit/server/lib/functions";
import {
  internalMutationGeneric,
  type Auth,
  type HttpRouter,
} from "convex/server";
import { AuthKit } from "@convex-dev/workos-authkit";
import { start } from "@convex-dev/workflow";
import { components, internal } from "@disposabl/backend/_generated/api";
import { env } from "@disposabl/backend/_generated/server";
import type { DataModel } from "@disposabl/backend/_generated/dataModel";

let authKitInstance: AuthKit<DataModel> | undefined;
function getAuthKit(): AuthKit<DataModel> {
  return (authKitInstance ??= new AuthKit<DataModel>(components.workOSAuthKit, {
    authFunctions: internal.disposabl,
  }));
}

// Loading function metadata must not require authentication credentials.
export const authKit = {
  get workos() {
    return getAuthKit().workos;
  },
  registerRoutes(router: HttpRouter) {
    getAuthKit().registerRoutes(router);
  },
};

export const authKitEvent = internalMutationGeneric({
  args: { event: v.string(), data: v.record(v.string(), v.any()) },
  returns: v.null(),
  handler: async (ctx, event) => {
    if (event.event === "user.created") {
      if (typeof event.data.id !== "string")
        throw new Error("Invalid WorkOS user event");
      await start(ctx, internal.disposabl.provisionPersonalOrganization, {
        userId: event.data.id,
      });
    }
    return null;
  },
});

const identityValidator = v.object(identityFields);

const unavailable = { code: "identity_provider_unavailable", status: 503 };
let issuer: string | undefined;
let keys: ReturnType<typeof createRemoteJWKSet> | undefined;
const sessionKeys = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function bearerToken(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) throw new ConvexError({ code: "unauthenticated", status: 401 });
  return token;
}

export async function getAuthKitIssuer() {
  if (issuer) return issuer;
  try {
    const authorizationUrl = authKit.workos.userManagement.getAuthorizationUrl({
      clientId: env.WORKOS_CLIENT_ID,
      provider: "authkit",
      redirectUri: new URL("/callback", env.CONVEX_SITE_URL).href,
    });
    const response = await fetch(authorizationUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    const location = response.headers.get("location");
    if (response.status !== 302 || !location)
      throw new Error("AuthKit discovery failed");
    const url = new URL(location);
    if (
      url.protocol !== "https:" ||
      !url.hostname.endsWith(".authkit.app") ||
      url.username ||
      url.password ||
      url.port
    )
      throw new Error("Invalid AuthKit origin");
    return (issuer = url.origin);
  } catch {
    throw new ConvexError(unavailable);
  }
}

async function accessTokenClaims(
  token: string,
  keySet: ReturnType<typeof createRemoteJWKSet>,
  options: JWTVerifyOptions,
) {
  try {
    const { payload } = await jwtVerify(token, keySet, {
      ...options,
      algorithms: ["RS256"],
      requiredClaims: ["exp", "sub"],
    });
    return payload;
  } catch (error) {
    if (
      error instanceof errors.JWTClaimValidationFailed ||
      error instanceof errors.JWTExpired ||
      error instanceof errors.JWTInvalid ||
      error instanceof errors.JWSInvalid ||
      error instanceof errors.JWSSignatureVerificationFailed ||
      error instanceof errors.JOSEAlgNotAllowed ||
      error instanceof errors.JWKSNoMatchingKey
    )
      throw new ConvexError({ code: "invalid_access_token", status: 401 });
    throw new ConvexError(unavailable);
  }
}

async function requireMembership(
  userId: unknown,
  orgId: unknown,
): Promise<ObjectType<typeof identityFields>> {
  if (typeof userId !== "string" || !userId.startsWith("user_"))
    throw new ConvexError({ code: "user_required", status: 403 });
  if (typeof orgId !== "string" || !orgId.startsWith("org_"))
    throw new ConvexError({ code: "organization_required", status: 403 });

  try {
    const { data } =
      await authKit.workos.userManagement.listOrganizationMemberships({
        userId,
        organizationId: orgId,
        statuses: ["active"],
        limit: 1,
      });
    const membership = data.find(
      (membership) =>
        membership.status === "active" &&
        membership.userId === userId &&
        membership.organizationId === orgId,
    );
    if (!membership)
      throw new ConvexError({
        code: "active_membership_required",
        status: 403,
      });
    const roles = (membership.roles ?? [membership.role]).map(
      (role) => role.slug,
    );
    const role = roles.includes("admin")
      ? "admin"
      : roles.includes("member")
        ? "member"
        : null;
    if (!role) throw new ConvexError({ code: "role_required", status: 403 });
    return { userId, orgId, role };
  } catch (error) {
    if (error instanceof ConvexError) throw error;
    throw new ConvexError(unavailable);
  }
}

export async function requireMcpUser(request: Request) {
  const token = bearerToken(request);
  const issuer = await getAuthKitIssuer();
  const payload = await accessTokenClaims(
    token,
    (keys ??= createRemoteJWKSet(new URL("/oauth2/jwks", issuer), {
      timeoutDuration: 10_000,
    })),
    { issuer, audience: new URL("/mcp", env.CONVEX_SITE_URL).href },
  );
  return requireMembership(payload.sub, payload.org_id);
}

async function requireApiKey(value: string) {
  try {
    const { apiKey } = await authKit.workos.apiKeys.createValidation({ value });
    if (!apiKey)
      throw new ConvexError({ code: "invalid_api_key", status: 401 });
    if (apiKey.owner.type !== "user")
      throw new ConvexError({ code: "user_api_key_required", status: 403 });
    if (!apiKey.permissions.includes("api:access"))
      throw new ConvexError({ code: "api_permission_required", status: 403 });
    return await requireMembership(
      apiKey.owner.id,
      apiKey.owner.organizationId,
    );
  } catch (error) {
    if (error instanceof ConvexError) throw error;
    const status =
      error && typeof error === "object" && "status" in error
        ? error.status
        : undefined;
    if (status === 401 || status === 403 || status === 422)
      throw new ConvexError({ code: "invalid_api_key", status: 401 });
    throw new ConvexError(unavailable);
  }
}

export const requireUser = async (
  source: { auth: Auth } | Request,
  clientId = env.WORKOS_CLIENT_ID,
) => {
  if (source instanceof Request) {
    const token = bearerToken(source);
    if (token.startsWith("sk_")) return requireApiKey(token);

    let keySet = sessionKeys.get(clientId);
    if (!keySet) {
      keySet = createRemoteJWKSet(
        new URL(`https://api.workos.com/sso/jwks/${clientId}`),
        { timeoutDuration: 10_000 },
      );
      sessionKeys.set(clientId, keySet);
    }
    const payload = await accessTokenClaims(token, keySet, {
      issuer: [
        "https://api.workos.com/",
        `https://api.workos.com/user_management/${clientId}`,
      ],
    });
    // Legacy tokens use a shared issuer and must identify this application.
    if (
      payload.iss === "https://api.workos.com/" ||
      payload.aud !== undefined
    ) {
      const audiences = Array.isArray(payload.aud)
        ? payload.aud
        : [payload.aud];
      if (!audiences.includes(clientId))
        throw new ConvexError({ code: "invalid_access_token", status: 401 });
    }
    return requireMembership(payload.sub, payload.org_id);
  }

  const identity = await source.auth.getUserIdentity();
  if (!identity)
    throw new ConvexError({ code: "unauthenticated", status: 401 });

  const roles = Array.isArray(identity.roles)
    ? identity.roles
    : [identity.role];

  const user = {
    userId: identity.subject,
    orgId: identity.org_id,
    role: roles.includes("admin")
      ? "admin"
      : roles.includes("member")
        ? "member"
        : null,
  };

  const issuers = [
    "https://api.workos.com/",
    `https://api.workos.com/user_management/${clientId}`,
  ];

  if (
    !issuers.includes(identity.issuer) ||
    !validate(identityValidator, user) ||
    !user.userId.startsWith("user_") ||
    !user.orgId?.toString().startsWith("org_")
  )
    throw new ConvexError({ code: "invalid_identity", status: 403 });

  return user;
};
