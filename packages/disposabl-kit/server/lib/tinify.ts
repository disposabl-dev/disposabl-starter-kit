import { fileTypeFromBuffer } from "file-type/core";
import { ConvexError } from "convex/values";
import { env } from "@disposabl/backend/_generated/server";

export const supportedImageTypes = new Set([
  "image/avif",
  "image/jxl",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function compressImage({
  mediaType,
  bytes,
}: {
  mediaType: string;
  bytes: ArrayBuffer;
}) {
  const detected = await fileTypeFromBuffer(new Uint8Array(bytes));
  mediaType = detected?.mime ?? mediaType;
  if (!supportedImageTypes.has(mediaType)) return { bytes, mediaType };

  const apiKey = env.TINIFY_API_KEY?.trim();
  if (!apiKey) return { bytes, mediaType };

  const headers = { Authorization: `Basic ${btoa(`api:${apiKey}`)}` };
  const response = await fetch("https://api.tinify.com/shrink", {
    method: "POST",
    headers,
    body: bytes,
    redirect: "error",
    signal: AbortSignal.timeout(60_000),
  });
  const location = response.headers.get("location");
  if (!response.ok || !location)
    throw new ConvexError({ code: "image_compression_failed", status: 503 });
  const output = new URL(location);
  if (output.origin !== "https://api.tinify.com")
    throw new ConvexError({ code: "image_compression_failed", status: 503 });
  // Download without a conversion request to preserve the original format.
  const compressed = await fetch(output, {
    headers,
    redirect: "error",
    signal: AbortSignal.timeout(60_000),
  });
  if (
    !compressed.ok ||
    compressed.headers.get("content-type")?.split(";")[0] !== mediaType
  )
    throw new ConvexError({ code: "image_compression_failed", status: 503 });
  const optimized = await compressed.arrayBuffer();
  return {
    bytes: optimized.byteLength < bytes.byteLength ? optimized : bytes,
    mediaType,
  };
}
