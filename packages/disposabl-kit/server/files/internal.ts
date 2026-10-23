import { R2 } from "@convex-dev/r2";
import { ConvexError, v } from "convex/values";
import { components, internal } from "@disposabl/backend/_generated/api";
import { env, type ActionCtx } from "@disposabl/backend/_generated/server";
import type { Id } from "@disposabl/backend/_generated/dataModel";
import {
  compressImage,
  supportedImageTypes,
} from "@disposabl/disposabl-kit/server/lib/tinify";
import {
  identityFields,
  internalAction,
  internalMutation,
  internalQuery,
} from "@disposabl/disposabl-kit/server/lib/functions";
import {
  completeUploadArgs,
  fileKeyArgs,
  uploadedFileResult,
  uploadFileArgs,
  uploadUrlResult,
} from "@disposabl/disposabl-kit/server/files/validators";

function hasR2Config() {
  return [
    env.R2_BUCKET,
    env.R2_ENDPOINT,
    env.R2_ACCESS_KEY_ID,
    env.R2_SECRET_ACCESS_KEY,
  ].every((value) => Boolean(value?.trim()));
}

function isConvexKey(key: string) {
  return key.split("/")[1] === "convex";
}

async function convexUrl(
  ctx: Pick<ActionCtx, "storage">,
  storageId: Id<"_storage">,
) {
  const url = await ctx.storage.getUrl(storageId);
  if (!url) throw new ConvexError({ code: "file_not_found", status: 404 });
  return url;
}

// Files are shared within the authenticated organization. Only the server
// chooses keys; callers never supply a key when requesting an upload URL.
function requireOrganizationKey(orgId: string, key: string) {
  if (!key.startsWith(`${encodeURIComponent(orgId)}/`)) {
    throw new ConvexError({ code: "file_access_denied", status: 403 });
  }
}

export const generateUploadUrl = internalMutation({
  args: { ...identityFields },
  returns: uploadUrlResult,
  handler: async (ctx, { orgId }) => {
    const prefix = encodeURIComponent(orgId);
    if (hasR2Config())
      return new R2(components.r2).generateUploadUrl(
        `${prefix}/${crypto.randomUUID()}`,
      );
    const key = `${prefix}/convex/${crypto.randomUUID()}`;
    await ctx.db.insert("files", { key, orgId });
    return {
      key,
      url: await ctx.storage.generateUploadUrl(),
      provider: "convex" as const,
    };
  },
});

export const getConvexFile = internalQuery({
  args: { ...identityFields, ...fileKeyArgs },
  returns: v.union(
    v.object({
      storageId: v.id("_storage"),
      contentType: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, { orgId, key }) => {
    requireOrganizationKey(orgId, key);
    const file = await ctx.db
      .query("files")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (!file || file.orgId !== orgId)
      throw new ConvexError({ code: "file_not_found", status: 404 });
    if (!file.storageId) return null;
    const metadata = await ctx.db.system.get("_storage", file.storageId);
    if (!metadata) return null;
    return { storageId: file.storageId, contentType: metadata.contentType };
  },
});

// Bind an upload once. Existing keys cannot be rebound to someone else's file.
export const saveConvexFile = internalMutation({
  args: {
    ...identityFields,
    ...fileKeyArgs,
    storageId: v.id("_storage"),
    previousStorageId: v.optional(v.id("_storage")),
  },
  returns: v.null(),
  handler: async (ctx, { orgId, key, storageId, previousStorageId }) => {
    requireOrganizationKey(orgId, key);
    const file = await ctx.db
      .query("files")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (!file || file.orgId !== orgId)
      throw new ConvexError({ code: "file_not_found", status: 404 });
    if (file.storageId === storageId) return null;
    if (file.storageId !== previousStorageId)
      throw new ConvexError({ code: "file_already_uploaded", status: 409 });
    const metadata = await ctx.db.system.get("_storage", storageId);
    const owner = await ctx.db
      .query("files")
      .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
      .unique();
    if (!metadata || metadata._creationTime < file._creationTime || owner)
      throw new ConvexError({ code: "file_access_denied", status: 403 });
    await ctx.db.patch("files", file._id, { storageId });
    return null;
  },
});

// Store the blob and its owning record in one transaction.
export const storeConvexFile = internalMutation({
  args: {
    ...identityFields,
    bytes: v.bytes(),
    contentType: v.string(),
  },
  returns: uploadedFileResult,
  handler: async (ctx, { orgId, bytes, contentType }) => {
    const key = `${encodeURIComponent(orgId)}/convex/${crypto.randomUUID()}`;
    const storageId = await ctx.storage.store(
      new Blob([bytes], { type: contentType }),
    );
    await ctx.db.insert("files", { key, orgId, storageId });
    return { key, url: await convexUrl(ctx, storageId) };
  },
});

export const syncMetadata = internalMutation({
  args: { ...identityFields, ...fileKeyArgs },
  returns: v.null(),
  handler: async (ctx, { orgId, key, ...identity }) => {
    requireOrganizationKey(orgId, key);
    if (isConvexKey(key)) {
      const file = await ctx.runQuery(
        internal.disposabl.getConvexFileInternal,
        { ...identity, orgId, key },
      );
      if (!file) throw new ConvexError({ code: "file_not_found", status: 404 });
      return null;
    }
    // R2 metadata requires a network request, so sync it in the component's
    // action after this mutation commits, as the official R2 client API does.
    const r2 = new R2(components.r2);
    await ctx.scheduler.runAfter(0, components.r2.lib.syncMetadata, {
      ...r2.config,
      key,
    });
    return null;
  },
});

export const uploadFile = internalAction({
  platforms: ["api", "mcp"],
  args: { ...identityFields, ...uploadFileArgs },
  returns: uploadedFileResult,
  handler: async (
    ctx,
    { orgId, base64, filename, contentType, ...identity },
  ): Promise<{ key: string; url: string }> => {
    let binary: string;
    try {
      binary = atob(base64);
    } catch {
      throw new ConvexError({ code: "invalid_base64", status: 400 });
    }
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const processed = await compressImage({
      bytes: bytes.buffer,
      mediaType: contentType || "application/octet-stream",
    });
    if (!hasR2Config()) {
      return ctx.runMutation(internal.disposabl.storeConvexFileInternal, {
        ...identity,
        orgId,
        bytes: processed.bytes,
        contentType: processed.mediaType,
      });
    }
    const r2 = new R2(components.r2);
    const key = await r2.store(ctx, new Uint8Array(processed.bytes), {
      key: `${encodeURIComponent(orgId)}/${crypto.randomUUID()}`,
      type: processed.mediaType,
      ...(filename
        ? {
            disposition: `attachment; filename*=UTF-8''${encodeURIComponent(
              filename,
            ).replace(
              /['()*]/g,
              (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
            )}`,
          }
        : {}),
    });
    return { key, url: await r2.getUrl(key) };
  },
});

// Direct uploads retain their provider even if configuration changes later.
export const completeUpload = internalAction({
  args: { ...identityFields, ...completeUploadArgs },
  returns: v.null(),
  handler: async (ctx, { orgId, key, storageId, ...identity }) => {
    requireOrganizationKey(orgId, key);
    if (isConvexKey(key)) {
      const user = { ...identity, orgId };
      if (storageId)
        await ctx.runMutation(internal.disposabl.saveConvexFileInternal, {
          ...user,
          key,
          storageId,
        });
      const file = await ctx.runQuery(
        internal.disposabl.getConvexFileInternal,
        { ...user, key },
      );
      if (!file) throw new ConvexError({ code: "file_not_found", status: 404 });
      if (
        !env.TINIFY_API_KEY?.trim() ||
        !file.contentType ||
        !supportedImageTypes.has(file.contentType)
      )
        return null;
      const currentId = file.storageId;
      const original = await ctx.storage.get(currentId);
      if (!original)
        throw new ConvexError({ code: "file_not_found", status: 404 });
      const bytes = await original.arrayBuffer();
      const processed = await compressImage({
        bytes,
        mediaType: original.type,
      });
      if (processed.bytes.byteLength < bytes.byteLength) {
        const optimizedId = await ctx.storage.store(
          new Blob([processed.bytes], { type: processed.mediaType }),
        );
        try {
          await ctx.runMutation(internal.disposabl.saveConvexFileInternal, {
            ...user,
            key,
            storageId: optimizedId,
            previousStorageId: currentId,
          });
        } catch (error) {
          await ctx.storage.delete(optimizedId);
          throw error;
        }
        await ctx.storage.delete(currentId);
      }
      return null;
    }
    const r2 = new R2(components.r2);
    await r2.syncMetadata(ctx, key);
    const metadata = await r2.getMetadata(ctx, key);
    const mediaType = metadata?.contentType;
    if (
      !env.TINIFY_API_KEY?.trim() ||
      !mediaType ||
      !supportedImageTypes.has(mediaType)
    )
      return null;
    const original = await fetch(await r2.getUrl(key), {
      signal: AbortSignal.timeout(60_000),
    });
    if (!original.ok)
      throw new ConvexError({ code: "file_read_failed", status: 503 });
    const bytes = await original.arrayBuffer();
    const processed = await compressImage({
      bytes,
      mediaType,
    });
    if (processed.bytes.byteLength < bytes.byteLength) {
      const { url } = await r2.generateUploadUrl(key);
      const uploaded = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": processed.mediaType },
        body: processed.bytes,
        signal: AbortSignal.timeout(60_000),
      });
      if (!uploaded.ok)
        throw new ConvexError({ code: "file_upload_failed", status: 503 });
      await r2.syncMetadata(ctx, key);
    }
    return null;
  },
});

// Actions generate fresh URLs on every request instead of caching an expiring
// signed URL in a query with no reactive dependencies.
export const getUrl = internalAction({
  platforms: ["api", "mcp"],
  args: { ...identityFields, ...fileKeyArgs },
  returns: v.string(),
  handler: async (ctx, { orgId, key, ...identity }): Promise<string> => {
    requireOrganizationKey(orgId, key);
    if (isConvexKey(key)) {
      const file = await ctx.runQuery(
        internal.disposabl.getConvexFileInternal,
        { ...identity, orgId, key },
      );
      if (!file) throw new ConvexError({ code: "file_not_found", status: 404 });
      return convexUrl(ctx, file.storageId);
    }
    return new R2(components.r2).getUrl(key);
  },
});
