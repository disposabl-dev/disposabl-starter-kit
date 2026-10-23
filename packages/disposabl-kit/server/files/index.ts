import { v, type Infer } from "convex/values";
import { internal } from "@disposabl/backend/_generated/api";
import { action, env, mutation } from "@disposabl/backend/_generated/server";
import { requireUser } from "@disposabl/disposabl-kit/server/auth";
import {
  completeUploadArgs,
  fileKeyArgs,
  uploadedFileResult,
  uploadFileArgs,
  uploadUrlResult,
} from "@disposabl/disposabl-kit/server/files/validators";

export const uploadFile = action({
  args: uploadFileArgs,
  returns: uploadedFileResult,
  handler: async (ctx, args): Promise<Infer<typeof uploadedFileResult>> => {
    const user = await requireUser(ctx, env.WORKOS_CLIENT_ID);
    return ctx.runAction(internal.disposabl.uploadFileInternal, {
      ...args,
      ...user,
    });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: uploadUrlResult,
  handler: async (ctx): Promise<Infer<typeof uploadUrlResult>> => {
    const user = await requireUser(ctx, env.WORKOS_CLIENT_ID);
    return ctx.runMutation(internal.disposabl.generateUploadUrlInternal, user);
  },
});

export const syncMetadata = mutation({
  args: fileKeyArgs,
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const user = await requireUser(ctx, env.WORKOS_CLIENT_ID);
    return ctx.runMutation(internal.disposabl.syncMetadataInternal, {
      ...args,
      ...user,
    });
  },
});

export const completeUpload = action({
  args: completeUploadArgs,
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const user = await requireUser(ctx, env.WORKOS_CLIENT_ID);
    return ctx.runAction(internal.disposabl.completeUploadInternal, {
      ...args,
      ...user,
    });
  },
});

export const getUrl = action({
  args: fileKeyArgs,
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    const user = await requireUser(ctx, env.WORKOS_CLIENT_ID);
    return ctx.runAction(internal.disposabl.getUrlInternal, {
      ...args,
      ...user,
    });
  },
});
