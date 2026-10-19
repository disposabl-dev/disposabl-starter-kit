import {
  internalQuery as nativeQuery,
  internalMutation as nativeMutation,
  internalAction as nativeAction,
} from "../_generated/server";
import { withPlatforms } from "@disposabl/disposabl-kit/server/lib";

export const internalQuery = withPlatforms(nativeQuery);
export const internalMutation = withPlatforms(nativeMutation);
export const internalAction = withPlatforms(nativeAction);
