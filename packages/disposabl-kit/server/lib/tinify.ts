"use node";

import tinify from "tinify";

import { env } from "@disposabl/backend/_generated/server";

const supportedMediaTypes = new Set([
  "image/avif",
  "image/heic",
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
  if (!supportedMediaTypes.has(mediaType)) return { bytes, mediaType };

  const apiKey = env.TINIFY_API_KEY?.trim();
  if (!apiKey) return { bytes, mediaType };

  tinify.key = apiKey;
  const compressed = await tinify
    .fromBuffer(new Uint8Array(bytes))
    .convert({ type: "image/png" })
    .toBuffer();
  return {
    bytes: Uint8Array.from(compressed).buffer,
    mediaType: "image/png" as const,
  };
}
