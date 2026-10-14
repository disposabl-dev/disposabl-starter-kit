import { v, type Infer } from "convex/values";
import { identityFields } from "disposabl-kit/server/lib";

export const accountIdentity = v.object(identityFields);

export type AccountIdentity = Infer<typeof accountIdentity>;
