import {
  internalActionGeneric,
  internalMutationGeneric,
  internalQueryGeneric,
  type ActionBuilder,
  type GenericDataModel,
  type MutationBuilder,
  type QueryBuilder,
} from "convex/server";
import type { GenericValidator, PropertyValidators } from "convex/values";
import type { Platforms } from "./platforms";
export type { Platforms } from "./platforms";

type Definition = {
  platforms?: Platforms;
  args?: GenericValidator | PropertyValidators;
  returns?: GenericValidator | PropertyValidators;
};
const metadata = new WeakMap<object, Definition>();
function track<A, R extends object>(builder: (definition: A) => R) {
  return (definition: A & { platforms?: Platforms }) => {
    const fn = builder(definition);
    if (definition.platforms?.length) metadata.set(fn, definition);
    return fn;
  };
}

/** Unselected and native functions have no transport metadata. */
export const getFunctionMetadata = (fn: unknown) => metadata.get(fn as object);

/** Native Convex signatures with an optional API/MCP field. */
export function createFunctions<D extends GenericDataModel>() {
  return {
    internalQuery: track(internalQueryGeneric as QueryBuilder<D, "internal">),
    internalMutation: track(
      internalMutationGeneric as MutationBuilder<D, "internal">,
    ),
    internalAction: track(
      internalActionGeneric as ActionBuilder<D, "internal">,
    ),
  };
}
export type InternalFunctions<D extends GenericDataModel> = ReturnType<
  typeof createFunctions<D>
>;
