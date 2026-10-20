import { registerStaticRoutes } from "@convex-dev/static-hosting";
import { httpRouter } from "convex/server";
import { components } from "@disposabl/backend/_generated/api";
import { authKit } from "@disposabl/disposabl-kit/server/auth";

const http = httpRouter();

authKit.registerRoutes(http);

registerStaticRoutes(http, components.staticHosting, {
  pathPrefix: "/",
  spaFallback: true,
});

export { http };
