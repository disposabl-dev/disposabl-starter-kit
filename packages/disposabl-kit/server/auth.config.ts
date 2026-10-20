import type { AuthConfig } from "convex/server";
import { env } from "@disposabl/backend/_generated/server";

export function createAuthConfig(): AuthConfig {
  const clientId = env.WORKOS_CLIENT_ID;
  const issuers = [
    "https://api.workos.com/",
    `https://api.workos.com/user_management/${clientId}`,
  ];
  return {
    providers: issuers.map((issuer) => ({
      type: "customJwt",
      issuer,
      algorithm: "RS256",
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
      ...(issuer === "https://api.workos.com/"
        ? { applicationID: clientId }
        : {}),
    })),
  };
}
