import { http } from "@disposabl/disposabl-kit/server/http";
import { httpActionGeneric } from "convex/server";

http.route({
  path: "/ping",
  method: "GET",
  handler: httpActionGeneric(async () => {
    return new Response("OK");
  }),
});

export default http;
