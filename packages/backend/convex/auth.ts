import { createAuth } from "disposabl-kit/server";
import { components } from "./_generated/api";
import { env } from "./_generated/server";
import type { DataModel } from "./_generated/dataModel";

export const { authkit, requireUser, identityFields } = createAuth<DataModel>(
  components.workOSAuthKit,
  {
    clientId: env.WORKOS_CLIENT_ID,
    apiKey: env.WORKOS_API_KEY,
    webhookSecret: env.WORKOS_WEBHOOK_SECRET,
  },
);
