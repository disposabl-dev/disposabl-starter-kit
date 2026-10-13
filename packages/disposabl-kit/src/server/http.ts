import {
  ConflictException,
  NotFoundException,
  SignatureVerificationException,
  UnprocessableEntityException,
  type WorkOS,
} from "@workos-inc/node";
import type { AuthKit } from "@convex-dev/workos-authkit";
import { registerStaticRoutes } from "@convex-dev/static-hosting";
import {
  httpRouter,
  httpActionGeneric,
  type GenericDataModel,
  type HttpRouter,
} from "convex/server";

export type HttpOptions<DataModel extends GenericDataModel> = {
  authKit: AuthKit<DataModel>;
  webhookSecret: string;
  staticHosting: Parameters<typeof registerStaticRoutes>[1];
  http?: HttpRouter;
  webhookPath?: string;
  /** Set false to manage role permissions yourself. Enable the API permission for keys in WorkOS. */
  apiAccess?: false | { roleSlug?: string; permissionSlug?: string };
  personal?:
    false | { name?: string; externalIdPrefix?: string; roleSlug?: string };
};

export function createHttp<DataModel extends GenericDataModel>({
  authKit,
  webhookSecret,
  staticHosting,
  http = httpRouter(),
  webhookPath = "/workos/webhook",
  apiAccess = {},
  personal = {},
}: HttpOptions<DataModel>) {
  const { workos, component } = authKit;
  http.route({
    path: webhookPath,
    method: "POST",
    handler: httpActionGeneric(async (ctx, request) => {
      let event;
      try {
        event = await workos.webhooks.constructEvent({
          payload: await request.text(),
          sigHeader: request.headers.get("workos-signature") ?? "",
          secret: webhookSecret,
        });
      } catch (error) {
        if (
          error instanceof SignatureVerificationException ||
          error instanceof SyntaxError
        )
          return new Response("Invalid webhook", { status: 400 });
        throw error;
      }
      if (event.event === "user.created" || event.event === "user.updated") {
        if (apiAccess)
          await ensureApiAccess(
            workos,
            apiAccess.roleSlug ?? "admin",
            apiAccess.permissionSlug ?? "api:access",
          );
        if (personal) {
          const userId = event.data.id;
          const synced = await ctx.runQuery(component.lib.getAuthUser, {
            id: userId,
          });
          if (!synced) {
            try {
              await workos.userManagement.getUser(userId);
            } catch (error) {
              if (error instanceof NotFoundException) return new Response("OK");
              throw error;
            }
            const externalId = `${personal.externalIdPrefix ?? "personal:"}${userId}`;
            const org = await workos.organizations
              .getOrganizationByExternalId(externalId)
              .catch(async (error: unknown) => {
                if (!(error instanceof NotFoundException)) throw error;
                try {
                  return await workos.organizations.createOrganization({
                    name: personal.name ?? "Personal",
                    externalId,
                  });
                } catch (error) {
                  // Another delivery may have created the same personal org.
                  if (!(error instanceof ConflictException)) throw error;
                  return workos.organizations.getOrganizationByExternalId(
                    externalId,
                  );
                }
              });
            const listMemberships = () =>
              workos.userManagement.listOrganizationMemberships({
                userId,
                organizationId: org.id,
                statuses: ["active", "inactive", "pending"],
                limit: 1,
              });
            // Replays must not restore revoked access or accept invitations.
            const { data } = await listMemberships();
            if (!data.length) {
              try {
                await workos.userManagement.createOrganizationMembership({
                  userId,
                  organizationId: org.id,
                  roleSlug: personal.roleSlug ?? "admin",
                });
              } catch (error) {
                // Acknowledge a create conflict only if membership now exists.
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
      // Synchronize only after provisioning succeeds so failed deliveries retry.
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
  registerStaticRoutes(http, staticHosting);
  return http;
}

async function ensureApiAccess(
  workos: WorkOS,
  roleSlug: string,
  permissionSlug: string,
) {
  await workos.authorization
    .getPermission(permissionSlug)
    .catch(async (error: unknown) => {
      if (!(error instanceof NotFoundException)) throw error;
      try {
        return await workos.authorization.createPermission({
          name: "API access",
          slug: permissionSlug,
        });
      } catch (error) {
        if (!(error instanceof ConflictException)) throw error;
        return workos.authorization.getPermission(permissionSlug);
      }
    });
  const role = await workos.authorization.getEnvironmentRole(roleSlug);
  for (const slug of [permissionSlug, "widgets:api-keys:manage"])
    if (!role.permissions.includes(slug))
      await workos.authorization.addEnvironmentRolePermission(roleSlug, {
        permissionSlug: slug,
      });
}
