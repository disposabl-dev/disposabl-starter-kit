import { afterEach, expect, test } from "bun:test";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildPlugins, readFiles, writePlugins } from "./generate-plugins";
import { generatePlatforms } from "./generate-platforms";

const roots: string[] = [];
const previous = {
  platforms: process.env.DISPOSABL_PLATFORMS,
  site: process.env.CONVEX_SITE_URL,
};
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
  if (previous.platforms === undefined) delete process.env.DISPOSABL_PLATFORMS;
  else process.env.DISPOSABL_PLATFORMS = previous.platforms;
  if (previous.site === undefined) delete process.env.CONVEX_SITE_URL;
  else process.env.CONVEX_SITE_URL = previous.site;
});
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "disposabl-plugins-test-"));
  roots.push(root);
  cpSync("packages/plugins", join(root, "packages/plugins"), {
    recursive: true,
  });
  return root;
}
const build = (root: string, platforms: string) =>
  buildPlugins({
    root,
    platforms,
    siteUrl: "https://plugins.example.convex.site",
  });

test.each([
  { flags: "", codex: false, claude: false },
  { flags: "api,mcp", codex: false, claude: false },
  { flags: "openai-plugin", codex: true, claude: false },
  { flags: "claude-plugin", codex: false, claude: true },
  { flags: "openai-plugin,claude-plugin", codex: true, claude: true },
])("plugin selection: $flags", ({ flags, codex, claude }) => {
  const files = build(fixture(), flags);
  expect(files.has("codex/plugin.json")).toBe(codex);
  expect(files.has("claude-code/.claude-plugin/plugin.json")).toBe(claude);
  expect(files.has(".agents/plugins/marketplace.json")).toBe(codex);
  expect(files.has(".claude-plugin/marketplace.json")).toBe(claude);
  const manifest = JSON.parse(
    readFileSync("packages/plugins/plugin.json", "utf8"),
  );
  for (const [host, enabled, config, transport, manifestPath] of [
    ["codex", codex, "mcp.json", "streamable-http", "plugin.json"],
    ["claude-code", claude, ".mcp.json", "http", ".claude-plugin/plugin.json"],
  ] as const) {
    expect([...files.keys()].some((path) => path.startsWith(`${host}/`))).toBe(
      enabled,
    );
    if (!enabled) continue;
    const parse = (path: string) =>
      JSON.parse(files.get(`${host}/${path}`)!.toString());
    expect(parse(manifestPath)).toMatchObject({
      name: manifest.name,
      version: manifest.version,
    });
    expect(parse(config).mcpServers[manifest.name]).toEqual({
      type: transport,
      url: "https://plugins.example.convex.site/mcp",
    });
    expect(files.get(`${host}/skills/setup/SKILL.md`)).toEqual(
      readFileSync("packages/plugins/skills/setup/SKILL.md"),
    );
  }
});

test("check mode never writes; regeneration preserves authored skills and removes disabled outputs", () => {
  const root = fixture();
  const source = readFiles(join(root, "packages/plugins"));
  const output = join(root, "generated/plugins");
  const both = build(root, "openai-plugin,claude-plugin");
  expect(() => writePlugins(root, both, true)).toThrow("out of date");
  expect(readFiles(output).size).toBe(0);
  writePlugins(root, both);
  writePlugins(root, both, true);
  expect(readFiles(output)).toEqual(both);
  const claude = build(root, "claude-plugin");
  writePlugins(root, claude);
  expect(readFiles(output)).toEqual(claude);
  writePlugins(root, build(root, ""));
  expect(readFiles(output).size).toBe(0);
  expect(readFiles(join(root, "packages/plugins"))).toEqual(source);
});

test("rejects invalid deployment origins before writing", () => {
  const root = fixture();
  for (const siteUrl of [
    "http://public.example",
    "https://user:password@example.com",
    "https://example.com/nested",
    "https://example.com?token=value",
  ])
    expect(() =>
      buildPlugins({ root, platforms: "openai-plugin", siteUrl }),
    ).toThrow();
  expect(readFiles(join(root, "generated/plugins")).size).toBe(0);
});

test("platform checks and breaking changes preserve the accepted artifacts", async () => {
  process.env.DISPOSABL_PLATFORMS = "";
  const root = fixture();
  const dir = join(root, "packages/backend/convex");
  mkdirSync(dir, { recursive: true });
  const functions = resolve("packages/disposabl-kit/server/lib/functions.ts");
  writeFileSync(
    join(dir, "fixture.ts"),
    `import { internalQuery, identityFields } from ${JSON.stringify(functions)};\nexport const read = internalQuery({ args: identityFields, returns: identityFields.orgId, platforms: ["api", "mcp"], handler: async () => "ok" });\n`,
  );
  await expect(generatePlatforms(dir, false, { check: true })).rejects.toThrow(
    "out of date",
  );
  expect(readFiles(join(root, "generated")).size).toBe(0);
  await generatePlatforms(dir);
  await generatePlatforms(dir, false, { check: true });
  // Modify only this temporary fixture's accepted contract to model a removal.
  const specPath = join(root, "generated/openapi.json");
  const before = JSON.parse(readFileSync(specPath, "utf8"));
  before.paths["/api/v1/fixture/removed"] = {
    post: {
      ...before.paths["/api/v1/fixture/read"].post,
      operationId: "fixture:removed",
    },
  };
  writeFileSync(specPath, JSON.stringify(before));
  const generated = readFiles(join(root, "generated"));
  const registry = readFileSync(join(dir, "platforms.generated.ts"), "utf8");
  await expect(generatePlatforms(dir)).rejects.toMatchObject({
    report: { code: "PLATFORM_BREAKING_CHANGE_APPROVAL_REQUIRED" },
  });
  expect(readFiles(join(root, "generated"))).toEqual(generated);
  expect(readFileSync(join(dir, "platforms.generated.ts"), "utf8")).toBe(
    registry,
  );
});
