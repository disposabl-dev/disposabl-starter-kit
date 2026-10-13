import type { AuthConfig } from "convex/server";

export function createAuthConfig(clientId: string): AuthConfig {
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
