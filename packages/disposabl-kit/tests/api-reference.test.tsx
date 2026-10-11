import { afterEach, expect, it, vi } from "vitest";
import { loadApiReference } from "../src/lib/api-reference";

afterEach(() => vi.unstubAllGlobals());

it("loads an API document and derives the Convex HTTP URL", async () => {
  const document = { openapi: "3.1.0", paths: { "/example": {} } };
  const fetchDocument = vi.fn().mockResolvedValue(Response.json(document));
  vi.stubGlobal("fetch", fetchDocument);
  expect(
    JSON.parse(
      (await loadApiReference({ convexUrl: "https://example.convex.cloud" }))!,
    ),
  ).toEqual({ ...document, servers: [{ url: "https://example.convex.site" }] });
  expect(fetchDocument).toHaveBeenCalledWith("/api-reference/openapi.json");
});

it("uses an app's document URL and explicit server URL", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ paths: {} })),
  );
  expect(
    await loadApiReference({
      url: "/spec.json",
      siteUrl: "https://api.example.com",
      convexUrl: "https://example.convex.cloud",
    }),
  ).toBe(
    JSON.stringify({
      paths: {},
      servers: [{ url: "https://api.example.com" }],
    }),
  );
  expect(fetch).toHaveBeenCalledWith("/spec.json");
});

it.each([
  new Response("Not found", { status: 404 }),
  new Response("<html>SPA fallback</html>"),
  Response.json({ message: "Not an API document" }),
])("handles absent or invalid API documents", async (response) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
  expect(await loadApiReference()).toBeNull();
});

it("handles unavailable document hosting", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Offline")));
  expect(await loadApiReference()).toBeNull();
});
