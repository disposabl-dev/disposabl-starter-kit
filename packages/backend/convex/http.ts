import { createHttp } from "disposabl-kit/server";
import { modules } from "./apiFunctions";
import { components } from "./_generated/api";
import { env } from "./_generated/server";
import { auth } from "./auth";

export default createHttp({
  auth,
  modules,
  platforms: env.DISPOSABL_PLATFORMS ?? "",
  staticHosting: components.staticHosting,
});
