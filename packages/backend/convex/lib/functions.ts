import { createPlatformFunctions } from "@disposabl/convex-platforms/functions";
import type { DataModel } from "../_generated/dataModel";

const functions = createPlatformFunctions<DataModel>();
type Functions = ReturnType<typeof createPlatformFunctions<DataModel>>;

export const internalQuery: Functions["internalQuery"] =
  functions.internalQuery;
export const internalMutation: Functions["internalMutation"] =
  functions.internalMutation;
export const internalAction: Functions["internalAction"] =
  functions.internalAction;
