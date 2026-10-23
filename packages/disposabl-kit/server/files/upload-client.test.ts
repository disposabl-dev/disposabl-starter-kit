import { afterEach, describe, expect, test } from "bun:test";
import { uploadToStorage } from "@disposabl/disposabl-kit/client/lib/upload-to-storage";

const browser = globalThis as unknown as {
  XMLHttpRequest?: typeof UploadRequest;
};
const original = browser.XMLHttpRequest;
class UploadRequest {
  static latest: UploadRequest;
  method = "";
  url = "";
  headers: Record<string, string> = {};
  body?: File;
  status = 200;
  statusText = "OK";
  responseText = "";
  timeout = 0;
  upload: { onprogress?: (event: { loaded: number; total: number }) => void } =
    {};
  onload?: () => void;
  onerror?: () => void;
  onabort?: () => void;
  ontimeout?: () => void;
  constructor() {
    UploadRequest.latest = this;
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: File) {
    this.body = body;
  }
}
function start(
  provider?: "convex",
  type = "text/plain",
  onProgress?: (progress: { loaded: number; total: number }) => void,
) {
  browser.XMLHttpRequest = UploadRequest;
  const file = new File(["hello"], "hello.txt", { type });
  const result = uploadToStorage(
    file,
    { url: "https://upload.example", provider },
    onProgress,
  );
  return { result, xhr: UploadRequest.latest, file };
}
afterEach(() => {
  browser.XMLHttpRequest = original;
});

describe("direct storage upload protocol", () => {
  test("POSTs to Convex and returns the storage ID", async () => {
    const { result, xhr, file } = start("convex");
    expect(xhr.method).toBe("POST");
    expect(xhr.body).toBe(file);
    expect(xhr.headers["Content-Type"]).toBe(file.type);
    xhr.responseText = JSON.stringify({ storageId: "storage_123" });
    xhr.onload!();
    expect(String(await result)).toBe("storage_123");
  });

  test("PUTs to R2 and accepts an empty response", async () => {
    const { result, xhr } = start();
    expect(xhr.method).toBe("PUT");
    xhr.onload!();
    expect(await result).toBeUndefined();
  });

  test("preserves upload progress and defaults an absent content type", async () => {
    const progress: { loaded: number; total: number }[] = [];
    const { result, xhr } = start("convex", "", (value) =>
      progress.push(value),
    );
    expect(xhr.headers["Content-Type"]).toBe("application/octet-stream");
    xhr.upload.onprogress!({ loaded: 2, total: 5 });
    expect(progress).toEqual([{ loaded: 2, total: 5 }]);
    xhr.responseText = JSON.stringify({ storageId: "storage_123" });
    xhr.onload!();
    await result;
  });

  test("rejects unsuccessful upload responses", async () => {
    const { result, xhr } = start();
    xhr.status = 403;
    xhr.statusText = "Forbidden";
    xhr.onload!();
    await expect(result).rejects.toThrow("Forbidden");
  });

  test("rejects malformed Convex upload responses", async () => {
    for (const response of ["invalid", "{}", '{"storageId":42}']) {
      const { result, xhr } = start("convex");
      xhr.responseText = response;
      xhr.onload!();
      await expect(result).rejects.toBeDefined();
    }
  });

  test("rejects network failures, cancellation, and timeouts", async () => {
    for (const event of ["onerror", "onabort", "ontimeout"] as const) {
      const { result, xhr } = start("convex");
      xhr[event]!();
      await expect(result).rejects.toBeDefined();
    }
  });
});
