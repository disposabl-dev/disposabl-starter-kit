import { v } from "convex/values";
import {
  internalQuery as nativeQuery,
  internalMutation as nativeMutation,
  internalAction as nativeAction,
} from "../../../backend/convex/_generated/server";
import type { Platforms } from "./platforms";

// Trusted server entrypoints must supply these values after authentication.
export const identityFields = {
  orgId: v.string(),
  userId: v.string(),
  role: v.union(v.literal("admin"), v.literal("member")),
};

const withPlatforms = <A, R extends object>(builder: (definition: A) => R) => {
  return (
    definition: A & { args: typeof identityFields; platforms?: Platforms },
  ): R => {
    for (const field of ["orgId", "userId", "role"] as const) {
      if (definition.args?.[field]?.isOptional !== "required") {
        throw new Error(
          `withPlatforms: args.${field} must be a required validator`,
        );
      }
    }
    return Object.assign(builder(definition), {
      platforms: definition.platforms,
    });
  };
};

export const internalQuery = withPlatforms(nativeQuery);
export const internalMutation = withPlatforms(nativeMutation);
export const internalAction = withPlatforms(nativeAction);
