import { v } from "convex/values";

export const fileKeyArgs = { key: v.string() };
export const completeUploadArgs = {
  ...fileKeyArgs,
  storageId: v.optional(v.id("_storage")),
};
export const uploadUrlResult = v.object({
  key: v.string(),
  url: v.string(),
  provider: v.optional(v.literal("convex")),
});
export const uploadFileArgs = {
  base64: v.string(),
  filename: v.optional(v.string()),
  contentType: v.optional(v.string()),
};
export const uploadedFileResult = v.object({
  key: v.string(),
  url: v.string(),
});
