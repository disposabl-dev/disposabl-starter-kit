import { createHttp } from "disposabl-kit/server";
import { components } from "./_generated/api";
import { env, httpAction } from "./_generated/server";
import { authkit } from "./auth";

const http = createHttp({
  authKit: authkit(),
  webhookSecret: env.WORKOS_WEBHOOK_SECRET,
  staticHosting: components.staticHosting,
});

http.route({
  path: "/v1/ping",
  method: "GET",
  handler: httpAction(async () => new Response("pong")),
});

export default http;
