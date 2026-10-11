import { getWorkOSAuthProviders } from "@disposabl/convex-platforms/oauth";
import { AuthConfig } from "convex/server";
import { env } from "./_generated/server";

const clientId = env.WORKOS_CLIENT_ID;

export default {
  providers: getWorkOSAuthProviders({
    clientId,
    siteUrl: env.CONVEX_SITE_URL,
    authkitUrl: env.WORKOS_AUTHKIT_URL,
  }),
} satisfies AuthConfig;
