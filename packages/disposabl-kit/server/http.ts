import { registerStaticRoutes } from "@convex-dev/static-hosting";
import { httpRouter, httpActionGeneric } from "convex/server";
import { components } from "../../backend/convex/_generated/api";

const http = httpRouter();

http.route({
  path: "/workos/webhook",
  method: "POST",
  // Logging-only placeholder. No signature verification or event processing yet.
  handler: httpActionGeneric(async (_ctx, request) => {
    const body = await request.json();
    console.log(body);
    return new Response("OK");
  }),
});

registerStaticRoutes(http, components.staticHosting, {
  pathPrefix: "/",
  spaFallback: true,
});

export { http };
