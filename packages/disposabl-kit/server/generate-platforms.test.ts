import { afterEach, expect, test } from "bun:test";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
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
function configure(
  platforms: string,
  site = "https://plugins.example.convex.site",
) {
  process.env.DISPOSABL_PLATFORMS = platforms;
  process.env.CONVEX_SITE_URL = site;
}
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "disposabl-platforms-test-"));
  roots.push(root);
  cpSync("packages/plugins", join(root, "packages/plugins"), {
    recursive: true,
  });
  const dir = join(root, "packages/backend/convex");
  mkdirSync(dir, { recursive: true });
  const functions = resolve("packages/disposabl-kit/server/lib/functions.ts");
  writeFileSync(
    join(dir, "fixture.ts"),
    `import { internalQuery, identityFields } from ${JSON.stringify(functions)};\nexport const read = internalQuery({ args: identityFields, returns: identityFields.orgId, platforms: ["api", "mcp"], handler: async () => "ok" });\n`,
  );
  return root;
}
function files(dir: string) {
  return new Map(
    existsSync(dir)
      ? [
          ...new Bun.Glob("**/*").scanSync({
            cwd: dir,
            onlyFiles: true,
            dot: true,
          }),
        ]
          .sort()
          .map((path) => [path, readFileSync(join(dir, path))] as const)
      : [],
  );
}
const generate = (root: string, check = false) =>
  generatePlatforms(join(root, "packages/backend/convex"), false, { check });

test.each([
  { flags: "", codex: false, claude: false },
  { flags: "api,mcp", codex: false, claude: false },
  { flags: "openai-plugin", codex: true, claude: false },
  { flags: "claude-plugin", codex: false, claude: true },
  { flags: "openai-plugin,claude-plugin", codex: true, claude: true },
])("platform generation: $flags", async ({ flags, codex, claude }) => {
  configure(flags);
  const root = fixture();
  await generate(root);
  await generate(root, true);
  expect(
    existsSync(join(root, "packages/backend/convex/platforms.generated.ts")),
  ).toBe(true);
  expect(existsSync(join(root, "generated/openapi.json"))).toBe(true);
  const output = files(join(root, "generated/plugins"));
  expect(output.has(".agents/plugins/marketplace.json")).toBe(codex);
  expect(output.has(".claude-plugin/marketplace.json")).toBe(claude);
  const manifest = JSON.parse(
    readFileSync("packages/plugins/plugin.json", "utf8"),
  );
  for (const [host, enabled, config, transport, manifestPath] of [
    ["codex", codex, "mcp.json", "streamable-http", "plugin.json"],
    ["claude-code", claude, ".mcp.json", "http", ".claude-plugin/plugin.json"],
  ] as const) {
    expect([...output.keys()].some((path) => path.startsWith(`${host}/`))).toBe(
      enabled,
    );
    if (!enabled) continue;
    const parse = (path: string) =>
      JSON.parse(output.get(`${host}/${path}`)!.toString());
    expect(parse(manifestPath)).toMatchObject({
      name: manifest.name,
      version: manifest.version,
    });
    expect(parse(config).mcpServers[manifest.name]).toEqual({
      type: transport,
      url: "https://plugins.example.convex.site/mcp",
    });
    expect(output.get(`${host}/skills/setup/SKILL.md`)).toEqual(
      readFileSync("packages/plugins/skills/setup/SKILL.md"),
    );
  }
});

test("check mode never writes; regeneration preserves authored skills and removes disabled outputs", async () => {
  configure("openai-plugin,claude-plugin");
  const root = fixture();
  const source = files(join(root, "packages/plugins"));
  const output = join(root, "generated/plugins");
  await expect(generate(root, true)).rejects.toThrow("out of date");
  expect(files(join(root, "generated")).size).toBe(0);
  await generate(root);
  const both = files(output);
  writeFileSync(join(output, "codex/plugin.json"), "stale");
  const stale = files(output);
  await expect(generate(root, true)).rejects.toThrow("out of date");
  expect(files(output)).toEqual(stale);
  await generate(root);
  expect(files(output)).toEqual(both);
  configure("claude-plugin");
  await generate(root);
  expect(files(output).has("codex/plugin.json")).toBe(false);
  expect(files(output).has("claude-code/.claude-plugin/plugin.json")).toBe(
    true,
  );
  configure("");
  await generate(root);
  expect(files(output).size).toBe(0);
  expect(files(join(root, "packages/plugins"))).toEqual(source);
});

test("rejects invalid deployment origins before writing any artifacts", async () => {
  const root = fixture();
  for (const site of [
    "http://public.example",
    "https://user:password@example.com",
    "https://example.com/nested",
    "https://example.com?token=value",
  ]) {
    configure("openai-plugin", site);
    await expect(generate(root)).rejects.toThrow("HTTPS origin");
  }
  expect(files(join(root, "generated")).size).toBe(0);
  expect(
    existsSync(join(root, "packages/backend/convex/platforms.generated.ts")),
  ).toBe(false);
});

test("breaking changes preserve the registry, OpenAPI, and both plugin packages", async () => {
  configure("openai-plugin,claude-plugin");
  const root = fixture();
  await generate(root);
  const specPath = join(root, "generated/openapi.json");
  // Modify only this temporary fixture's accepted contract to model a removal.
  const before = JSON.parse(readFileSync(specPath, "utf8"));
  before.paths["/api/v1/fixture/removed"] = {
    post: {
      ...before.paths["/api/v1/fixture/read"].post,
      operationId: "fixture:removed",
    },
  };
  writeFileSync(specPath, JSON.stringify(before));
  const generated = files(join(root, "generated"));
  const registryPath = join(
    root,
    "packages/backend/convex/platforms.generated.ts",
  );
  const registry = readFileSync(registryPath, "utf8");
  await expect(generate(root)).rejects.toMatchObject({
    report: { code: "PLATFORM_BREAKING_CHANGE_APPROVAL_REQUIRED" },
  });
  expect(files(join(root, "generated"))).toEqual(generated);
  expect(readFileSync(registryPath, "utf8")).toBe(registry);
});
