import { createHttp } from "@disposabl/disposabl-kit/server/http";
import { httpAction } from "./_generated/server";
import { modules } from "./platforms.generated";

const http = createHttp({ modules }).router;

http.route({
  path: "/ping",
  method: "GET",
  handler: httpAction(async () => new Response("OK")),
});

export default http;
