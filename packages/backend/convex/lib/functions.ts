import { createFunctions } from "disposabl-kit/server/lib/functions";
import type { DataModel } from "../_generated/dataModel";

export const { internalQuery, internalMutation, internalAction } =
  createFunctions<DataModel>();
