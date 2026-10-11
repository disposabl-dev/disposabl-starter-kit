export async function loadApiReference({
  url = "/api-reference/openapi.json",
  siteUrl,
  convexUrl,
}: {
  url?: string;
  siteUrl?: string;
  convexUrl?: string;
} = {}): Promise<string | null> {
  const response = await fetch(url).catch(() => null);
  const document: unknown = response?.ok
    ? await response.json().catch(() => null)
    : null;
  if (!document || typeof document !== "object" || !("paths" in document))
    return null;
  const serverUrl =
    siteUrl ?? convexUrl?.replace(".convex.cloud", ".convex.site");
  return JSON.stringify(
    serverUrl ? { ...document, servers: [{ url: serverUrl }] } : document,
  );
}
