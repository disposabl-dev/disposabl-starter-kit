import type { Id } from "@disposabl/backend/_generated/dataModel";

export function uploadToStorage(
  file: File,
  target: { url: string; provider?: "convex" },
  onProgress?: (progress: { loaded: number; total: number }) => void,
): Promise<Id<"_storage"> | undefined> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(target.provider === "convex" ? "POST" : "PUT", target.url);
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream",
    );
    if (onProgress)
      xhr.upload.onprogress = (event) =>
        onProgress({ loaded: event.loaded, total: event.total });
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Failed to upload file: ${xhr.statusText}`));
        return;
      }
      if (target.provider !== "convex") {
        resolve(undefined);
        return;
      }
      try {
        const { storageId } = JSON.parse(xhr.responseText);
        if (typeof storageId !== "string" || !storageId)
          throw new Error("Upload did not return a storage ID");
        resolve(storageId as Id<"_storage">);
      } catch (error) {
        reject(error);
      }
    };
    xhr.onerror = () => reject(new Error("Failed to upload file"));
    xhr.onabort = () => reject(new Error("File upload aborted"));
    xhr.ontimeout = () => reject(new Error("File upload timed out"));
    xhr.send(file);
  });
}
