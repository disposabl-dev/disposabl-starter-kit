import { v } from "convex/values";

export const fileKeyArgs = { key: v.string() };
export const uploadUrlResult = v.object({ key: v.string(), url: v.string() });
export const uploadFileArgs = {
  base64: v.string(),
  filename: v.optional(v.string()),
  contentType: v.optional(v.string()),
};
export const uploadedFileResult = v.object({
  key: v.string(),
  url: v.string(),
});
