import { afterEach, describe, expect, test } from "bun:test";
import { R2 } from "@convex-dev/r2";
import { getFunctionName } from "convex/server";
import type { Infer, ObjectType } from "convex/values";
import { internal } from "@disposabl/backend/_generated/api";
import * as files from "@disposabl/disposabl-kit/server/files/internal";
import type {
  uploadFileArgs,
  uploadedFileResult,
  uploadUrlResult,
} from "@disposabl/disposabl-kit/server/files/validators";

type Identity = { orgId: string; userId: string; role: "member" };
const identity: Identity = {
  orgId: "org_one",
  userId: "user_one",
  role: "member",
};
const config = {
  R2_BUCKET: "files-test",
  R2_ENDPOINT: "https://files-test.r2.cloudflarestorage.com",
  R2_ACCESS_KEY_ID: "test-access-key",
  R2_SECRET_ACCESS_KEY: "test-secret-key",
};
const previous = { ...process.env };
const originalFetch = globalThis.fetch;
function configure(r2: Partial<typeof config> = {}) {
  for (const key of [...Object.keys(config), "TINIFY_API_KEY"])
    delete process.env[key];
  Object.assign(process.env, r2);
}
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of [...Object.keys(config), "TINIFY_API_KEY"]) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
});
function handler<A, R>(fn: unknown) {
  return (ctx: unknown, args: A): Promise<R> =>
    (fn as { _handler: (ctx: unknown, args: A) => Promise<R> })._handler(
      ctx,
      args,
    );
}
const generate = handler<Identity, Infer<typeof uploadUrlResult>>(
  files.generateUploadUrl,
);
const getUrl = handler<Identity & { key: string }, string>(files.getUrl);
const upload = handler<
  Identity & ObjectType<typeof uploadFileArgs>,
  Infer<typeof uploadedFileResult>
>(files.uploadFile);
const complete = handler<Identity & { key: string; storageId?: string }, null>(
  files.completeUpload,
);
const lookup = handler<
  Identity & { key: string },
  { storageId: string; contentType?: string } | null
>(files.getConvexFile);
const save = handler<
  Identity & { key: string; storageId: string; previousStorageId?: string },
  null
>(files.saveConvexFile);

type Row = {
  _id: string;
  _creationTime: number;
  key: string;
  orgId: string;
  storageId?: string;
};
function context() {
  const rows: Row[] = [];
  const blobs = new Map<string, Blob>();
  const times = new Map<string, number>();
  let clock = 0;
  const db = {
    insert: async (
      _table: string,
      value: Omit<Row, "_id" | "_creationTime">,
    ) => {
      const _id = `file_${rows.length}`;
      rows.push({ ...value, _id, _creationTime: ++clock });
      return _id;
    },
    query: () => ({
      withIndex: (
        _index: string,
        select: (q: {
          eq: (field: keyof Row, value: string) => Row[];
        }) => Row[],
      ) => ({
        unique: async () =>
          select({
            eq: (field, value) => rows.filter((row) => row[field] === value),
          })[0] ?? null,
      }),
    }),
    patch: async (_table: string, id: string, value: Partial<Row>) => {
      Object.assign(
        rows.find((row) => row._id === id)!,
        value,
      );
    },
    system: {
      get: async (_table: string, id: string) =>
        blobs.has(id)
          ? { _creationTime: times.get(id), contentType: blobs.get(id)!.type }
          : null,
    },
  };
  const ctx = {
    db,
    storage: {
      generateUploadUrl: async () => "https://storage.example/upload",
      store: async (blob: Blob) => {
        const id = `storage_${++clock}`;
        blobs.set(id, blob);
        times.set(id, clock);
        return id;
      },
      get: async (id: string) => blobs.get(id) ?? null,
      getUrl: async (id: string) =>
        blobs.has(id) ? `https://storage.example/${id}` : null,
      delete: async (id: string) => {
        blobs.delete(id);
      },
    },
    runMutation: async (ref: unknown, args: unknown): Promise<unknown> => {
      const name = getFunctionName(
        ref as Parameters<typeof getFunctionName>[0],
      );
      if (
        name === getFunctionName(internal.disposabl.generateUploadUrlInternal)
      )
        return generate(ctx, args as Identity);
      if (name === getFunctionName(internal.disposabl.saveConvexFileInternal))
        return save(ctx, args as Parameters<typeof save>[1]);
      throw new Error(`Unexpected mutation ${name}`);
    },
    runQuery: async (_ref: unknown, args: Parameters<typeof lookup>[1]) =>
      lookup(ctx, args),
  };
  return { ctx, rows, blobs };
}

describe("storage provider fallback", () => {
  test("uploads binary data in one call without R2 credentials", async () => {
    configure();
    const { ctx, rows, blobs } = context();
    const bytes = new Uint8Array([0, 255, 128, 13, 10, 42]);
    const result = await upload(ctx, {
      ...identity,
      base64: btoa(String.fromCharCode(...bytes)),
      contentType: "application/pdf",
    });
    expect(result.key).toMatch(/^org_one\/convex\/[0-9a-f-]{36}$/);
    expect(rows[0]?.storageId).toBeDefined();
    const blob = blobs.get(rows[0]!.storageId!)!;
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes);
    expect(blob.type).toBe("application/pdf");
    expect(await getUrl(ctx, { ...identity, key: result.key })).toBe(
      result.url,
    );
  });

  test("partial and whitespace-only R2 configuration use Convex", async () => {
    for (const partial of [
      { R2_BUCKET: config.R2_BUCKET },
      { ...config, R2_SECRET_ACCESS_KEY: "  " },
    ]) {
      configure(partial);
      const { ctx } = context();
      expect((await generate(ctx, identity)).provider).toBe("convex");
    }
  });

  test("complete R2 configuration keeps the signed PUT upload path", async () => {
    configure(config);
    const result = await generate({}, identity);
    expect(result.provider).toBeUndefined();
    expect(result.key).toMatch(/^org_one\/[0-9a-f-]{36}$/);
    expect(new URL(result.url).searchParams.has("X-Amz-Signature")).toBe(true);
  });

  test("one-call R2 uploads retain the existing key and result contract", async () => {
    configure(config);
    const originalStore = R2.prototype.store;
    const originalGetUrl = R2.prototype.getUrl;
    R2.prototype.store = async (_ctx, value, options) => {
      expect(new TextDecoder().decode(value as Uint8Array)).toBe("hello");
      return typeof options === "string" ? options : options!.key!;
    };
    R2.prototype.getUrl = async (key) => `https://r2.example/${key}`;
    try {
      const result = await upload({}, { ...identity, base64: btoa("hello") });
      expect(result.key).toMatch(/^org_one\/[0-9a-f-]{36}$/);
      expect(result.url).toBe(`https://r2.example/${result.key}`);
    } finally {
      R2.prototype.store = originalStore;
      R2.prototype.getUrl = originalGetUrl;
    }
  });

  test("finalizes direct Convex uploads and allows retrying the same binding", async () => {
    configure();
    const { ctx } = context();
    const target = await generate(ctx, identity);
    const storageId = await ctx.storage.store(new Blob(["hello"]));
    await complete(ctx, { ...identity, key: target.key, storageId });
    await complete(ctx, { ...identity, key: target.key, storageId });
    expect(await getUrl(ctx, { ...identity, key: target.key })).toContain(
      storageId,
    );
    configure(config);
    expect(await getUrl(ctx, { ...identity, key: target.key })).toContain(
      storageId,
    );
  });

  test("rejects cross-organization access even when the caller changes the key prefix", async () => {
    configure();
    const { ctx } = context();
    const result = await upload(ctx, { ...identity, base64: btoa("private") });
    for (const key of [
      result.key,
      result.key.replace("org_one/", "org_two/"),
    ]) {
      await expect(
        getUrl(ctx, { ...identity, orgId: "org_two", key }),
      ).rejects.toBeDefined();
    }
  });

  test("rejects attaching a file that belongs to another organization", async () => {
    configure();
    const { ctx, rows } = context();
    const pending = await generate(ctx, identity);
    await upload(ctx, {
      ...identity,
      orgId: "org_two",
      base64: btoa("private"),
    });
    const foreignId = rows.find((row) => row.orgId === "org_two")!.storageId!;
    await expect(
      complete(ctx, { ...identity, key: pending.key, storageId: foreignId }),
    ).rejects.toMatchObject({ data: { code: "file_access_denied" } });
  });

  test("rejects old unregistered storage IDs and rebinding a completed key", async () => {
    configure();
    const { ctx } = context();
    const oldId = await ctx.storage.store(new Blob(["unrelated"]));
    const pending = await generate(ctx, identity);
    await expect(
      complete(ctx, { ...identity, key: pending.key, storageId: oldId }),
    ).rejects.toMatchObject({ data: { code: "file_access_denied" } });
    const storageId = await ctx.storage.store(new Blob(["owned"]));
    await complete(ctx, { ...identity, key: pending.key, storageId });
    const replacement = await ctx.storage.store(new Blob(["replacement"]));
    await expect(
      complete(ctx, { ...identity, key: pending.key, storageId: replacement }),
    ).rejects.toMatchObject({ data: { code: "file_already_uploaded" } });
  });

  test("rejects invalid base64 and unfinished or deleted files", async () => {
    configure();
    const { ctx, blobs } = context();
    await expect(
      upload(ctx, { ...identity, base64: "not!base64" }),
    ).rejects.toMatchObject({ data: { code: "invalid_base64" } });
    const target = await generate(ctx, identity);
    await expect(
      getUrl(ctx, { ...identity, key: target.key }),
    ).rejects.toMatchObject({ data: { code: "file_not_found" } });
    const result = await upload(ctx, { ...identity, base64: btoa("hello") });
    blobs.clear();
    await expect(
      getUrl(ctx, { ...identity, key: result.key }),
    ).rejects.toMatchObject({ data: { code: "file_not_found" } });
  });

  test("compresses a direct Convex image while retaining its durable key", async () => {
    configure();
    process.env.TINIFY_API_KEY = "test-tinify-key";
    const { ctx, rows, blobs } = context();
    const target = await generate(ctx, identity);
    const png = Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aazsAAAAASUVORK5CYII=",
      ),
      (char) => char.charCodeAt(0),
    );
    const storageId = await ctx.storage.store(
      new Blob([png], { type: "image/png" }),
    );
    globalThis.fetch = (async (input) => {
      if (input === "https://api.tinify.com/shrink")
        return new Response(null, {
          status: 201,
          headers: { location: "https://api.tinify.com/output/test" },
        });
      return new Response(png.slice(0, 40), {
        headers: { "Content-Type": "image/png" },
      });
    }) as typeof fetch;
    await complete(ctx, { ...identity, key: target.key, storageId });
    expect(rows[0]!.key).toBe(target.key);
    expect(rows[0]!.storageId).not.toBe(storageId);
    expect(blobs.has(storageId)).toBe(false);
    expect(blobs.get(rows[0]!.storageId!)!.size).toBe(40);
    expect(await getUrl(ctx, { ...identity, key: target.key })).toContain(
      rows[0]!.storageId!,
    );
  });

  test("does not read non-image file bytes when compression is configured", async () => {
    configure();
    process.env.TINIFY_API_KEY = "test-tinify-key";
    const { ctx } = context();
    const target = await generate(ctx, identity);
    const storageId = await ctx.storage.store(
      new Blob(["document"], { type: "application/pdf" }),
    );
    ctx.storage.get = async () => {
      throw new Error("Non-image bytes must stay in storage");
    };
    expect(
      await complete(ctx, { ...identity, key: target.key, storageId }),
    ).toBeNull();
  });
});
