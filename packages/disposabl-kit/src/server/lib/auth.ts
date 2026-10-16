import { AuthKit } from "@convex-dev/workos-authkit";
import {
  ConflictException,
  NotFoundException,
  SignatureVerificationException,
  UnprocessableEntityException,
} from "@workos-inc/node";
import {
  httpActionGeneric,
  type GenericDataModel,
  type GenericQueryCtx,
  type HttpRouter,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { createRemoteJWKSet, errors, jwtVerify } from "jose";

const unavailable = { code: "identity_provider_unavailable", status: 503 };

async function findOrCreate<T>(
  find: () => Promise<T>,
  create: () => Promise<T>,
) {
  try {
    return await find();
  } catch (error) {
    if (!(error instanceof NotFoundException)) throw error;
    try {
      return await create();
    } catch (error) {
      if (!(error instanceof ConflictException)) throw error;
      return find();
    }
  }
}

function requireBearerToken(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) throw new ConvexError({ code: "unauthenticated", status: 401 });
  return token;
}

// Only authenticated entrypoints supply these fields to internal functions.
export const identityFields = {
  orgId: v.string(),
  userId: v.string(),
  role: v.union(v.literal("admin"), v.literal("member")),
};

function userIdentity(userId: unknown, orgId: unknown, roles: unknown[]) {
  if (typeof userId !== "string" || !userId.startsWith("user_"))
    throw new ConvexError({ code: "user_required", status: 403 });
  if (typeof orgId !== "string" || !orgId.startsWith("org_"))
    throw new ConvexError({ code: "organization_required", status: 403 });
  const role = roles.includes("admin")
    ? ("admin" as const)
    : roles.includes("member")
      ? ("member" as const)
      : null;
  if (!role) throw new ConvexError({ code: "role_required", status: 403 });
  return { orgId, userId, role };
}

export function createAuth<DataModel extends GenericDataModel>(
  component: AuthKit<DataModel>["component"],
  options: NonNullable<ConstructorParameters<typeof AuthKit<DataModel>>[1]> & {
    clientId: string;
    apiKey: string;
    webhookSecret: string;
    siteUrl: string;
    /** Set false to manage API role permissions yourself. */
    apiAccess?: false | { roleSlug?: string; permissionSlug?: string };
    personal?:
      false | { name?: string; externalIdPrefix?: string; roleSlug?: string };
  },
) {
  let authKit: AuthKit<DataModel> | undefined;
  const authkit = () =>
    (authKit ??= new AuthKit<DataModel>(component, options));
  let issuer: string | undefined;
  let keys: ReturnType<typeof createRemoteJWKSet> | undefined;
  const getAuthKitIssuer = async () => {
    if (issuer) return issuer;
    try {
      const authorizationUrl =
        authkit().workos.userManagement.getAuthorizationUrl({
          clientId: options.clientId,
          provider: "authkit",
          redirectUri: new URL("/callback", options.siteUrl).href,
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
  };
  const requireMembership = async (userId: string, orgId: string) => {
    try {
      const { data } =
        await authkit().workos.userManagement.listOrganizationMemberships({
          userId,
          organizationId: orgId,
          statuses: ["active"],
          limit: 1,
        });
      const member = data[0];
      if (!member)
        throw new ConvexError({
          code: "active_membership_required",
          status: 403,
        });
      return userIdentity(
        userId,
        orgId,
        (member.roles ?? [member.role]).map((role) => role.slug),
      );
    } catch (error) {
      if (error instanceof ConvexError) throw error;
      throw new ConvexError(unavailable);
    }
  };

  // Public Convex functions pass ctx; MCP HTTP handlers pass the request.
  const requireUser = async (
    source: Pick<GenericQueryCtx<DataModel>, "auth"> | Request,
  ) => {
    if (!("auth" in source)) {
      const token = requireBearerToken(source);
      const issuer = await getAuthKitIssuer();
      let payload;
      try {
        ({ payload } = await jwtVerify(
          token,
          (keys ??= createRemoteJWKSet(new URL(`${issuer}/oauth2/jwks`), {
            timeoutDuration: 10_000,
          })),
          {
            issuer,
            audience: new URL("/mcp", options.siteUrl).href,
            algorithms: ["RS256"],
            requiredClaims: ["exp", "sub"],
          },
        ));
      } catch (error) {
        if (
          error instanceof errors.JOSEError &&
          !(error instanceof errors.JWKSTimeout)
        )
          throw new ConvexError({ code: "invalid_access_token", status: 401 });
        throw new ConvexError(unavailable);
      }
      if (typeof payload.sub !== "string" || !payload.sub.startsWith("user_"))
        throw new ConvexError({ code: "user_required", status: 403 });
      if (
        typeof payload.org_id !== "string" ||
        !payload.org_id.startsWith("org_")
      )
        throw new ConvexError({ code: "organization_required", status: 403 });
      return requireMembership(payload.sub, payload.org_id);
    }
    const identity = await source.auth.getUserIdentity().catch(() => null);
    if (!identity)
      throw new ConvexError({ code: "unauthenticated", status: 401 });
    if (
      ![
        "https://api.workos.com/",
        `https://api.workos.com/user_management/${options.clientId}`,
      ].includes(identity.issuer)
    )
      throw new ConvexError({ code: "session_required", status: 403 });
    return userIdentity(
      identity.subject,
      identity.org_id,
      Array.isArray(identity.roles) ? identity.roles : [identity.role],
    );
  };

  const requireApiUser = async (request: Request) => {
    const value = requireBearerToken(request);
    try {
      const { apiKey } = await authkit().workos.apiKeys.createValidation({
        value,
      });
      if (!apiKey)
        throw new ConvexError({ code: "invalid_api_key", status: 401 });
      if (apiKey.owner.type !== "user")
        throw new ConvexError({ code: "user_api_key_required", status: 403 });
      if (
        !apiKey.permissions.includes(
          options.apiAccess === false
            ? "api:access"
            : (options.apiAccess?.permissionSlug ?? "api:access"),
        )
      )
        throw new ConvexError({ code: "api_permission_required", status: 403 });
      const userId = apiKey.owner.id;
      const orgId = apiKey.owner.organizationId;
      if (!userId.startsWith("user_") || !orgId.startsWith("org_"))
        throw new ConvexError({ code: "invalid_api_key", status: 401 });
      return await requireMembership(userId, orgId);
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
  };
  return {
    authkit,
    requireUser,
    requireApiUser,
    getAuthKitIssuer,
    identityFields,
    siteUrl: options.siteUrl,
    registerRoutes(http: HttpRouter) {
      const { workos } = authkit();
      const { personal = {}, apiAccess = {} } = options;
      http.route({
        path: options.webhookPath ?? "/workos/webhook",
        method: "POST",
        handler: httpActionGeneric(async (ctx, request) => {
          let event;
          try {
            event = await workos.webhooks.constructEvent({
              payload: await request.text(),
              sigHeader: request.headers.get("workos-signature") ?? "",
              secret: options.webhookSecret,
            });
          } catch (error) {
            if (
              error instanceof SignatureVerificationException ||
              error instanceof SyntaxError
            )
              return new Response("Invalid webhook", { status: 400 });
            throw error;
          }
          if (
            event.event === "user.created" ||
            event.event === "user.updated"
          ) {
            if (apiAccess) {
              const roleSlug = apiAccess.roleSlug ?? "admin";
              const permissionSlug = apiAccess.permissionSlug ?? "api:access";
              await findOrCreate(
                () => workos.authorization.getPermission(permissionSlug),
                () =>
                  workos.authorization.createPermission({
                    name: "API access",
                    slug: permissionSlug,
                  }),
              );
              const role =
                await workos.authorization.getEnvironmentRole(roleSlug);
              for (const slug of [permissionSlug, "widgets:api-keys:manage"])
                if (!role.permissions.includes(slug))
                  await workos.authorization.addEnvironmentRolePermission(
                    roleSlug,
                    { permissionSlug: slug },
                  );
            }
            if (personal) {
              const userId = event.data.id;
              const synced = await ctx.runQuery(component.lib.getAuthUser, {
                id: userId,
              });
              if (!synced) {
                try {
                  await workos.userManagement.getUser(userId);
                } catch (error) {
                  if (error instanceof NotFoundException)
                    return new Response("OK");
                  throw error;
                }
                const externalId = `${personal.externalIdPrefix ?? "personal:"}${userId}`;
                const org = await findOrCreate(
                  () =>
                    workos.organizations.getOrganizationByExternalId(
                      externalId,
                    ),
                  () =>
                    workos.organizations.createOrganization({
                      name: personal.name ?? "Personal",
                      externalId,
                    }),
                );
                const listMemberships = () =>
                  workos.userManagement.listOrganizationMemberships({
                    userId,
                    organizationId: org.id,
                    statuses: ["active", "inactive", "pending"],
                    limit: 1,
                  });
                // Replays must not restore revoked access or accept invitations.
                if (!(await listMemberships()).data.length) {
                  try {
                    await workos.userManagement.createOrganizationMembership({
                      userId,
                      organizationId: org.id,
                      roleSlug: personal.roleSlug ?? "admin",
                    });
                  } catch (error) {
                    // Acknowledge a conflict only if membership now exists.
                    if (
                      !(
                        error instanceof ConflictException ||
                        error instanceof UnprocessableEntityException
                      ) ||
                      !(await listMemberships()).data.length
                    )
                      throw error;
                  }
                }
              }
            }
          }
          // Synchronize after provisioning so failed deliveries retry.
          await ctx.runMutation(component.lib.onWebhookEvent, {
            event: {
              id: event.id,
              event: event.event,
              data: event.data,
              createdAt: event.createdAt,
            },
          });
          return new Response("OK");
        }),
      });
    },
  };
}

export type Auth<DataModel extends GenericDataModel = GenericDataModel> =
  ReturnType<typeof createAuth<DataModel>>;
