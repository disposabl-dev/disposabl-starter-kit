// Register the kit's functions with one re-export in the app's convex directory.
export { authKitEvent } from "./auth";
export * from "./account/internal";
export { uploadFile, generateUploadUrl, syncMetadata, getUrl } from "./files";
export {
  uploadFile as uploadFileInternal,
  generateUploadUrl as generateUploadUrlInternal,
  syncMetadata as syncMetadataInternal,
  getUrl as getUrlInternal,
} from "./files/internal";
