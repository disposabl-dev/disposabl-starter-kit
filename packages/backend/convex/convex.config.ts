import { defineApp } from "convex/server";
import { v } from "convex/values";
import staticHosting from "@convex-dev/static-hosting/convex.config";
import authKit from "@convex-dev/workos-authkit/convex.config";

const app = defineApp({
  env: {
    TEAMS_ENABLED: v.optional(v.string()),
    WORKOS_CLIENT_ID: v.string(),
    WORKOS_AUTHKIT_URL: v.optional(v.string()),
    WORKOS_API_KEY: v.string(),
    WORKOS_WEBHOOK_SECRET: v.string(),
  },
});
app.use(staticHosting);
app.use(authKit);
export default app;
