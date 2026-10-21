import { v, type GenericValidator } from "convex/values";
import {
  internalQuery as nativeQuery,
  internalMutation as nativeMutation,
  internalAction as nativeAction,
} from "@disposabl/backend/_generated/server";
import type { Platforms } from "@disposabl/disposabl-kit/server/lib/platforms";

// Trusted server entrypoints must supply these values after authentication.
export const identityFields = {
  orgId: v.string(),
  userId: v.string(),
  role: v.union(v.literal("admin"), v.literal("member")),
};

const withPlatforms = <A, R extends object>(builder: (definition: A) => R) => {
  return (
    definition: A & {
      args: typeof identityFields;
      returns: GenericValidator;
      platforms?: Platforms;
    },
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
      args: definition.args,
      returns: definition.returns,
    });
  };
};

export const internalQuery = withPlatforms(nativeQuery);
export const internalMutation = withPlatforms(nativeMutation);
export const internalAction = withPlatforms(nativeAction);
