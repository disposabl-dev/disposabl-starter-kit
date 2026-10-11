import {
  ConflictException,
  NotFoundException,
  SignatureVerificationException,
  UnprocessableEntityException,
} from "@workos-inc/node";
import { httpRouter, ROUTABLE_HTTP_METHODS } from "convex/server";
import { registerStaticRoutes } from "@convex-dev/static-hosting";
import { env, httpAction } from "./_generated/server";
import { components } from "./_generated/api";
import { getAuthKit } from "./auth";

const authKit = getAuthKit();

const http = httpRouter();
http.route({
  path: "/workos/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let event;
    try {
      event = await authKit.workos.webhooks.constructEvent({
        payload: await request.text(),
        sigHeader: request.headers.get("workos-signature") ?? "",
        secret: env.WORKOS_WEBHOOK_SECRET,
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
      const userId = event.data.id;
      const synced = await ctx.runQuery(
        components.workOSAuthKit.lib.getAuthUser,
        { id: userId },
      );
      if (!synced) {
        try {
          await authKit.workos.userManagement.getUser(userId);
        } catch (error) {
          if (error instanceof NotFoundException) return new Response("OK");
          throw error;
        }
        const externalId = `personal:${userId}`;
        const org = await authKit.workos.organizations
          .getOrganizationByExternalId(externalId)
          .catch(async (error: unknown) => {
            if (!(error instanceof NotFoundException)) throw error;
            try {
              return await authKit.workos.organizations.createOrganization({
                name: "Personal",
                externalId,
              });
            } catch (error) {
              // Another delivery may have created the same personal org.
              if (!(error instanceof ConflictException)) throw error;
              return authKit.workos.organizations.getOrganizationByExternalId(
                externalId,
              );
            }
          });
        const listMemberships = () =>
          authKit.workos.userManagement.listOrganizationMemberships({
            userId,
            organizationId: org.id,
            statuses: ["active", "inactive", "pending"],
            limit: 1,
          });
        // Preserve inactive/pending memberships. Replaying a user event must
        // not reactivate access that was revoked or accept an invitation.
        const { data } = await listMemberships();
        if (!data.length) {
          try {
            await authKit.workos.userManagement.createOrganizationMembership({
              userId,
              organizationId: org.id,
              roleSlug: "admin",
            });
          } catch (error) {
            // Only acknowledge a create conflict if the membership now exists.
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
    // Commit user synchronization only after org creation succeeds. A failed
    // request stays unacknowledged so WorkOS can retry the same event.
    await ctx.runMutation(components.workOSAuthKit.lib.onWebhookEvent, {
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
// Reserve API paths so missing endpoints never return the SPA document.
const missingApi = httpAction(async () =>
  Response.json({ error: "not_found" }, { status: 404 }),
);
for (const method of ROUTABLE_HTTP_METHODS) {
  http.route({ path: "/api", method, handler: missingApi });
  http.route({ pathPrefix: "/api/", method, handler: missingApi });
}
registerStaticRoutes(http, components.staticHosting);
export default http;
