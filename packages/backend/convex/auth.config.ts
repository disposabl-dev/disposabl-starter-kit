import { createAuthConfig } from "disposabl-kit/server";
import { env } from "./_generated/server";

export default createAuthConfig(env.WORKOS_CLIENT_ID);
