import { api } from "@disposabl/backend/_generated/api";
import { useAction, useMutation } from "convex/react";
import { useCallback } from "react";
import { uploadToStorage } from "@disposabl/disposabl-kit/client/lib/upload-to-storage";

/** Upload, finish image compression, and return the durable file key. */
export function useUploadFile() {
  const generateUploadUrl = useMutation(api.disposabl.generateUploadUrl);
  const completeUpload = useAction(api.disposabl.completeUpload);
  return useCallback(
    async (
      file: File,
      options?: {
        onProgress?: (progress: { loaded: number; total: number }) => void;
      },
    ) => {
      const target = await generateUploadUrl({});
      const storageId = await uploadToStorage(
        file,
        target,
        options?.onProgress,
      );
      const { key } = target;
      await completeUpload({ key, ...(storageId ? { storageId } : {}) });
      return key;
    },
    [generateUploadUrl, completeUpload],
  );
}
