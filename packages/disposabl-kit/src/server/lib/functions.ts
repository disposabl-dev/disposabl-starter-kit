import {
  internalActionGeneric,
  internalMutationGeneric,
  internalQueryGeneric,
  type ActionBuilder,
  type GenericActionCtx,
  type GenericDataModel,
  type GenericMutationCtx,
  type GenericQueryCtx,
  type MutationBuilder,
  type QueryBuilder,
  type RegisteredAction,
  type RegisteredMutation,
  type RegisteredQuery,
} from "convex/server";
import type {
  GenericValidator,
  Infer,
  ObjectType,
  PropertyValidators,
} from "convex/values";

/** Generation metadata only. These flags do not authorize requests or create routes. */
export type Platforms =
  boolean | Partial<Record<"api" | "cli" | "mcp" | "sdk", boolean>>;

type Definition<
  Ctx,
  Args extends PropertyValidators,
  Returns extends GenericValidator,
> = {
  platforms?: Platforms;
  args: Args;
  returns: Returns;
  handler: (
    ctx: Ctx,
    args: ObjectType<Args>,
  ) => Infer<Returns> | Promise<Infer<Returns>>;
};

type PlatformMetadata = {
  platforms: Platforms;
  validators: { args: PropertyValidators; returns: GenericValidator };
};

/** Read metadata attached by createFunctions without changing Convex reference types. */
export function getFunctionMetadata(fn: object): PlatformMetadata {
  const metadata = fn as Partial<PlatformMetadata>;
  if (!metadata.validators)
    throw new Error(
      "Function must be defined with createFunctions to expose its validators.",
    );
  return {
    platforms: metadata.platforms ?? false,
    validators: metadata.validators,
  };
}

/** Bind native internal builders to the app's generated DataModel. */
export function createFunctions<DataModel extends GenericDataModel>() {
  const query = internalQueryGeneric as QueryBuilder<DataModel, "internal">;
  const mutation = internalMutationGeneric as MutationBuilder<
    DataModel,
    "internal"
  >;
  const action = internalActionGeneric as ActionBuilder<DataModel, "internal">;
  return {
    internalQuery: <A extends PropertyValidators, R extends GenericValidator>({
      platforms = false,
      ...definition
    }: Definition<GenericQueryCtx<DataModel>, A, R>): RegisteredQuery<
      "internal",
      ObjectType<A>,
      Infer<R>
    > =>
      Object.assign(query(definition), {
        platforms,
        validators: { args: definition.args, returns: definition.returns },
      }),
    internalMutation: <
      A extends PropertyValidators,
      R extends GenericValidator,
    >({
      platforms = false,
      ...definition
    }: Definition<GenericMutationCtx<DataModel>, A, R>): RegisteredMutation<
      "internal",
      ObjectType<A>,
      Infer<R>
    > =>
      Object.assign(mutation(definition), {
        platforms,
        validators: { args: definition.args, returns: definition.returns },
      }),
    internalAction: <A extends PropertyValidators, R extends GenericValidator>({
      platforms = false,
      ...definition
    }: Definition<GenericActionCtx<DataModel>, A, R>): RegisteredAction<
      "internal",
      ObjectType<A>,
      Infer<R>
    > =>
      Object.assign(action(definition), {
        platforms,
        validators: { args: definition.args, returns: definition.returns },
      }),
  };
}

export type InternalFunctions<DataModel extends GenericDataModel> = ReturnType<
  typeof createFunctions<DataModel>
>;
