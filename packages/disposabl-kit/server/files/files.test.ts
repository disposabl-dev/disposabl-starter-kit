import { describe, expect, test } from "bun:test";
import { R2 } from "@convex-dev/r2";
import type { Infer, ObjectType } from "convex/values";
import type {
  uploadedFileResult,
  uploadFileArgs,
  uploadUrlResult,
} from "@disposabl/disposabl-kit/server/files/validators";

// Exercise the real R2 signer with test credentials. No network calls or bucket
// writes occur. Restore the environment after constructing the module's client.
const config = {
  R2_BUCKET: "files-test",
  R2_ENDPOINT: "https://files-test.r2.cloudflarestorage.com",
  R2_ACCESS_KEY_ID: "test-access-key",
  R2_SECRET_ACCESS_KEY: "test-secret-key",
};
const previous = Object.fromEntries(
  Object.keys(config).map((key) => [key, process.env[key]]),
);
let files: typeof import("@disposabl/disposabl-kit/server/files/internal");
try {
  Object.assign(process.env, config);
  files = await import("@disposabl/disposabl-kit/server/files/internal");
} finally {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

type Identity = { orgId: string; userId: string; role: "admin" | "member" };
const identity: Identity = {
  orgId: "org_one",
  userId: "user_one",
  role: "member",
};
const key = "org_one/11111111-1111-4111-8111-111111111111";

// Invoke Convex's internal handler to exercise our authorization boundary.
function handler<A, R>(fn: unknown) {
  const run = (fn as { _handler: (ctx: unknown, args: A) => R | Promise<R> })
    ._handler;
  return async (ctx: unknown, args: A) => run(ctx, args);
}

const generate = handler<Identity, Infer<typeof uploadUrlResult>>(
  files.generateUploadUrl,
);
const getUrl = handler<Identity & { key: string }, string>(files.getUrl);
const sync = handler<Identity & { key: string }, null>(files.syncMetadata);
const upload = handler<
  Identity & ObjectType<typeof uploadFileArgs>,
  Infer<typeof uploadedFileResult>
>(files.uploadFile);

type PutInput = {
  Key: string;
  Body: Uint8Array;
  ContentType: string;
  ContentDisposition?: string;
};

// Replace only the S3 network boundary; exercise the real r2.store implementation
// including its metadata synchronization. Restore the client getter after each test.
async function withPut(
  send: (command: { input: PutInput }) => Promise<object>,
  run: () => Promise<void>,
) {
  const descriptor = Object.getOwnPropertyDescriptor(R2.prototype, "client")!;
  Object.defineProperty(R2.prototype, "client", {
    configurable: true,
    get: () => ({ send }),
  });
  try {
    await run();
  } finally {
    Object.defineProperty(R2.prototype, "client", descriptor);
  }
}

describe("organization file uploads", () => {
  test("uploads bytes and syncs metadata in one call before returning a download URL", async () => {
    const events: string[] = [];
    let storedKey = "";
    const bytes = new Uint8Array([0, 255, 128, 13, 10, 42]);
    const ctx = {
      runQuery: () => Promise.resolve(null),
      runAction: async (_ref: unknown, args: { key: string }) => {
        expect(events).toEqual(["put"]);
        expect(args.key).toBe(storedKey);
        await Promise.resolve();
        events.push("synced");
      },
    };
    // Keep the real signer available while r2.store uses a stub S3 connection.
    // Separate assertions for URL signing are covered below.
    const originalGetUrl = R2.prototype.getUrl;
    R2.prototype.getUrl = async (uploadedKey) => {
      expect(events).toEqual(["put", "synced"]);
      return `https://download.example/${uploadedKey}`;
    };
    try {
      await withPut(
        async ({ input }) => {
          storedKey = input.Key;
          expect(storedKey).toMatch(/^org_one\/[0-9a-f-]{36}$/);
          expect(input.Body).toEqual(bytes);
          expect(input.ContentType).toBe("application/pdf");
          expect(input.ContentDisposition).toBe(
            "attachment; filename*=UTF-8''report%20%281%29.pdf",
          );
          events.push("put");
          return {};
        },
        async () => {
          const result = await upload(ctx, {
            ...identity,
            base64: btoa(String.fromCharCode(...bytes)),
            filename: "report (1).pdf",
            contentType: "application/pdf",
          });
          expect(result).toEqual({
            key: storedKey,
            url: `https://download.example/${storedKey}`,
          });
        },
      );
    } finally {
      R2.prototype.getUrl = originalGetUrl;
    }
  });

  test("rejects invalid base64 before touching storage", async () => {
    await expect(
      upload({}, { ...identity, base64: "not!base64" }),
    ).rejects.toMatchObject({
      data: { code: "invalid_base64", status: 400 },
    });
  });

  test("propagates upload failures without syncing metadata", async () => {
    await withPut(
      async () => {
        throw new Error("R2 upload failed");
      },
      async () => {
        await expect(
          upload(
            { runQuery: () => Promise.resolve(null) },
            { ...identity, base64: "aGVsbG8=" },
          ),
        ).rejects.toThrow("R2 upload failed");
      },
    );
  });

  test("does not report success when metadata synchronization fails", async () => {
    await withPut(
      async ({ input }) => {
        expect(input.ContentType).toBe("application/octet-stream");
        return {};
      },
      async () => {
        await expect(
          upload(
            {
              runQuery: () => Promise.resolve(null),
              runAction: () =>
                Promise.reject(new Error("Metadata sync failed")),
            },
            { ...identity, base64: "aGVsbG8=" },
          ),
        ).rejects.toThrow("Metadata sync failed");
      },
    );
  });

  test("issues unique signed PUT URLs using only server-selected keys", async () => {
    const first = await generate({}, identity);
    const second = await generate({}, identity);
    expect(first.key).toMatch(/^org_one\/[0-9a-f-]{36}$/);
    expect(second.key).not.toBe(first.key);
    const url = new URL(first.url);
    expect(url.hostname).toBe("files-test.files-test.r2.cloudflarestorage.com");
    expect(decodeURIComponent(url.pathname)).toBe(`/${first.key}`);
    expect(url.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256");
    expect(url.searchParams.has("X-Amz-Signature")).toBe(true);
    expect(first.url).not.toContain(config.R2_SECRET_ACCESS_KEY);
  });

  test("generates a private download URL for organization members", async () => {
    const url = new URL(await getUrl({}, { ...identity, key }));
    expect(decodeURIComponent(url.pathname)).toBe(`/${key}`);
    expect(url.searchParams.get("X-Amz-Expires")).toBe("900");
    expect(url.searchParams.has("X-Amz-Signature")).toBe(true);
  });

  test("schedules metadata sync only for a valid organization key", async () => {
    const scheduled: unknown[][] = [];
    const ctx = {
      scheduler: {
        runAfter: (...args: unknown[]) => {
          scheduled.push(args);
          return Promise.resolve("scheduled");
        },
      },
    };
    expect(await sync(ctx, { ...identity, key })).toBeNull();
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]?.[0]).toBe(0);
    expect(scheduled[0]?.[2]).toEqual({
      key,
      bucket: config.R2_BUCKET,
      endpoint: config.R2_ENDPOINT,
      accessKeyId: config.R2_ACCESS_KEY_ID,
      secretAccessKey: config.R2_SECRET_ACCESS_KEY,
    });
  });

  test("rejects cross-organization, prefix-confusion, and traversal keys", async () => {
    for (const denied of [
      key.replace("org_one/", "org_two/"),
      key.replace("org_one/", "org_one_extra/"),
      "org_one/../org_two/file",
      "org_one/%2e%2e%2forg_two%2ffile",
      "org_one/anything",
      "org_one/",
      "",
    ]) {
      const args = { ...identity, key: denied };
      // An empty context also proves sync rejects before scheduling any work.
      await expect(getUrl({}, args)).rejects.toMatchObject({
        data: { code: "file_access_denied", status: 403 },
      });
      await expect(sync({}, args)).rejects.toMatchObject({
        data: { code: "file_access_denied", status: 403 },
      });
    }
  });
});
