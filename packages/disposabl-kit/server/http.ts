import { httpRouter, httpActionGeneric } from "convex/server";

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

export { http };
