import { defineApp } from "convex/server";
import { v } from "convex/values";
import staticHosting from "@convex-dev/static-hosting/convex.config";
import authKit from "@convex-dev/workos-authkit/convex.config";
import workflow from "@convex-dev/workflow/convex.config";
import r2 from "@convex-dev/r2/convex.config";

const app = defineApp({
  env: {
    DISPOSABL_PLATFORMS: v.optional(v.string()),
    TEAMS_ENABLED: v.optional(v.string()),
    R2_BUCKET: v.optional(v.string()),
    R2_ENDPOINT: v.optional(v.string()),
    R2_ACCESS_KEY_ID: v.optional(v.string()),
    R2_SECRET_ACCESS_KEY: v.optional(v.string()),
    TINIFY_API_KEY: v.optional(v.string()),
    WORKOS_CLIENT_ID: v.string(),
    WORKOS_API_KEY: v.string(),
    WORKOS_WEBHOOK_SECRET: v.string(),
  },
});
app.use(staticHosting);
app.use(authKit);
app.use(workflow);
app.use(r2);
export default app;
