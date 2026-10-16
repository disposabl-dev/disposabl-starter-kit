import { createAuth } from "disposabl-kit/server/lib";
import { components } from "./_generated/api";
import { env } from "./_generated/server";
import type { DataModel } from "./_generated/dataModel";

export const auth = createAuth<DataModel>(components.workOSAuthKit, {
  clientId: env.WORKOS_CLIENT_ID,
  apiKey: env.WORKOS_API_KEY,
  webhookSecret: env.WORKOS_WEBHOOK_SECRET,
  siteUrl: env.CONVEX_SITE_URL,
});

export const {
  authkit,
  requireUser,
  requireApiUser,
  getAuthKitIssuer,
  identityFields,
} = auth;
