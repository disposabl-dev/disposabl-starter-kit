import { R2 } from "@convex-dev/r2";
import { ConvexError, v } from "convex/values";
import { components } from "@disposabl/backend/_generated/api";
import {
  identityFields,
  internalAction,
  internalMutation,
} from "@disposabl/disposabl-kit/server/lib/functions";
import {
  fileKeyArgs,
  uploadedFileResult,
  uploadFileArgs,
  uploadUrlResult,
} from "@disposabl/disposabl-kit/server/files/validators";

const r2 = new R2(components.r2);

// Files are shared within the authenticated organization. Only the server
// chooses keys; callers never supply a key when requesting an upload URL.
function requireOrganizationKey(orgId: string, key: string) {
  const prefix = `${encodeURIComponent(orgId)}/`;
  const objectId = key.slice(prefix.length);
  if (
    !key.startsWith(prefix) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      objectId,
    )
  ) {
    throw new ConvexError({ code: "file_access_denied", status: 403 });
  }
}

export const generateUploadUrl = internalMutation({
  args: { ...identityFields },
  returns: uploadUrlResult,
  handler: (_ctx, { orgId }) =>
    r2.generateUploadUrl(`${encodeURIComponent(orgId)}/${crypto.randomUUID()}`),
});

export const syncMetadata = internalMutation({
  args: { ...identityFields, ...fileKeyArgs },
  returns: v.null(),
  handler: async (ctx, { orgId, key }) => {
    requireOrganizationKey(orgId, key);
    // R2 metadata requires a network request, so sync it in the component's
    // action after this mutation commits, as the official R2 client API does.
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
  handler: async (ctx, { orgId, base64, filename, contentType }) => {
    let binary: string;
    try {
      binary = atob(base64);
    } catch {
      throw new ConvexError({ code: "invalid_base64", status: 400 });
    }
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const key = await r2.store(ctx, bytes, {
      key: `${encodeURIComponent(orgId)}/${crypto.randomUUID()}`,
      type: contentType || "application/octet-stream",
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

// Actions generate fresh URLs on every request instead of caching an expiring
// signed URL in a query with no reactive dependencies.
export const getUrl = internalAction({
  platforms: ["api", "mcp"],
  args: { ...identityFields, ...fileKeyArgs },
  returns: v.string(),
  handler: (_ctx, { orgId, key }) => {
    requireOrganizationKey(orgId, key);
    return r2.getUrl(key);
  },
});
