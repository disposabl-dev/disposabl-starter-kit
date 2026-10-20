import { useUploadFile as useR2UploadFile } from "@convex-dev/r2/react";
import { api } from "@disposabl/backend/_generated/api";

/** Upload directly to R2 and return the durable object key. */
export function useUploadFile() {
  return useR2UploadFile(api.disposabl);
}
