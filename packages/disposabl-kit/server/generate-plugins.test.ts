import { afterEach, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
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
import {
  buildPlugins,
  filesDigest,
  json,
  readFiles,
  writePlugins,
  type PluginContract,
} from "./generate-plugins";
import { generatePlatforms } from "./generate-platforms";
import { releasePlugins } from "./release-plugins";

const contract: PluginContract = JSON.parse(
  readFileSync("generated/openapi.json", "utf8"),
);
const roots: string[] = [];
const previousEnv = {
  platforms: process.env.DISPOSABL_PLATFORMS,
  site: process.env.CONVEX_SITE_URL,
};
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
  if (previousEnv.platforms === undefined)
    delete process.env.DISPOSABL_PLATFORMS;
  else process.env.DISPOSABL_PLATFORMS = previousEnv.platforms;
  if (previousEnv.site === undefined) delete process.env.CONVEX_SITE_URL;
  else process.env.CONVEX_SITE_URL = previousEnv.site;
});
function fixture() {
  const work = mkdtempSync(join(tmpdir(), "disposabl-plugins-test-"));
  roots.push(work);
  const root = join(work, "repo");
  mkdirSync(join(root, "generated"), { recursive: true });
  cpSync("packages/plugins", join(root, "packages/plugins"), {
    recursive: true,
  });
  const manifestPath = join(root, "packages/plugins/plugin.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.version = "0.1.0";
  writeFileSync(manifestPath, json(manifest));
  writeFileSync(join(root, "generated/openapi.json"), json(contract));
  return { root, output: join(work, "release") };
}
function configure(platforms = "openai-plugin,claude-plugin") {
  process.env.DISPOSABL_PLATFORMS = platforms;
  process.env.CONVEX_SITE_URL = "https://plugins.example.invalid";
}
function git(root: string, ...args: string[]) {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}
function commitFixture(root: string) {
  git(root, "init", "-q");
  git(root, "add", ".");
  git(
    root,
    "-c",
    "user.name=Plugin tests",
    "-c",
    "user.email=plugins@example.invalid",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-qm",
    "fixture",
  );
}

test.each([
  { flags: "", codex: false, claude: false },
  { flags: "api,mcp", codex: false, claude: false },
  { flags: "openai-plugin", codex: true, claude: false },
  { flags: "claude-plugin", codex: false, claude: true },
  { flags: "openai-plugin,claude-plugin", codex: true, claude: true },
])("plugin selection: $flags", ({ flags, codex, claude }) => {
  const { root } = fixture();
  const bundle = buildPlugins({
    root,
    platforms: flags,
    siteUrl: "https://plugins.example.invalid",
    contract,
  });
  const paths = [...(bundle?.files.keys() ?? [])];
  expect(paths.some((path) => path.startsWith("codex/"))).toBe(codex);
  expect(paths.some((path) => path.startsWith("claude-code/"))).toBe(claude);
  for (const host of ["codex", "claude-code"]) {
    if (!paths.some((path) => path.startsWith(`${host}/`))) continue;
    expect(bundle!.files.get(`${host}/skills/setup/SKILL.md`)).toEqual(
      readFileSync("packages/plugins/skills/setup/SKILL.md"),
    );
  }
  if (codex && claude) {
    const parse = (path: string) =>
      JSON.parse(new TextDecoder().decode(bundle!.files.get(path)));
    const openai = parse("codex/plugin.json");
    const anthropic = parse("claude-code/.claude-plugin/plugin.json");
    expect(openai.name).toBe(anthropic.name);
    expect(openai.version).toBe(anthropic.version);
    expect(parse("codex/mcp.json").mcpServers.disposabl).toEqual({
      type: "streamable-http",
      url: "https://plugins.example.invalid/mcp",
    });
    expect(parse("claude-code/.mcp.json").mcpServers.disposabl).toEqual({
      type: "http",
      url: "https://plugins.example.invalid/mcp",
    });
  }
});

test("checks are read-only and regeneration preserves source while removing disabled outputs", () => {
  const { root } = fixture();
  const build = (platforms: string) =>
    buildPlugins({
      root,
      platforms,
      siteUrl: "https://plugins.example.invalid",
      contract,
    });
  const source = filesDigest(readFiles(join(root, "packages/plugins")));
  const both = build("openai-plugin,claude-plugin")!;
  expect(() => writePlugins(root, both, true)).toThrow("out of date");
  expect(readFiles(join(root, "generated/plugins")).size).toBe(0);
  writePlugins(root, both);
  writePlugins(root, both, true);
  expect(filesDigest(readFiles(join(root, "generated/plugins")))).toBe(
    filesDigest(both.files),
  );
  writePlugins(root, build("claude-plugin"));
  expect(
    [...readFiles(join(root, "generated/plugins")).keys()].some((path) =>
      path.startsWith("codex/"),
    ),
  ).toBe(false);
  writePlugins(root, undefined);
  expect(readFiles(join(root, "generated/plugins")).size).toBe(0);
  expect(filesDigest(readFiles(join(root, "packages/plugins")))).toBe(source);
});

test("rejects missing tools, invalid skill names, and invalid deployment origins before writing", () => {
  const { root } = fixture();
  const options = {
    root,
    platforms: "openai-plugin",
    siteUrl: "https://plugins.example.invalid",
    contract,
  };
  const savedSite = process.env.CONVEX_SITE_URL;
  delete process.env.CONVEX_SITE_URL;
  expect(() => buildPlugins({ ...options, siteUrl: undefined })).toThrow();
  if (savedSite !== undefined) process.env.CONVEX_SITE_URL = savedSite;
  for (const siteUrl of [
    "http://public.example",
    "https://user:password@example.com",
    "https://example.com/nested",
    "https://example.com?token=value",
  ])
    expect(() => buildPlugins({ ...options, siteUrl })).toThrow();
  expect(
    buildPlugins({ ...options, siteUrl: "http://localhost:3211" }),
  ).toBeDefined();
  expect(() =>
    buildPlugins({ ...options, contract: { "x-mcp-tools": {} } }),
  ).toThrow("required MCP tool");
  const path = join(root, "packages/plugins/skills/setup/SKILL.md");
  writeFileSync(
    path,
    "---\nname: renamed\ndescription: Verify access\n---\nCheck access.\n",
  );
  expect(() => buildPlugins(options)).toThrow("match its directory");
  expect(readFiles(join(root, "generated/plugins")).size).toBe(0);
});

test("creates identical archives, records skill hashes, and rejects changed contents at an existing version", () => {
  configure();
  const { root, output } = fixture();
  commitFixture(root);
  const first = releasePlugins({ root, output });
  const secondOutput = `${output}-second`;
  const second = releasePlugins({ root, output: secondOutput });
  expect(first).toEqual(second);
  expect(first.dirty).toBe(false);
  expect(first.version).toBe("0.1.0");
  expect(Object.keys(first.skills).sort()).toEqual([
    "account-overview",
    "setup",
  ]);
  for (const host of ["codex", "claude-code"]) {
    expect(readFileSync(join(output, `${host}.zip`))).toEqual(
      readFileSync(join(secondOutput, `${host}.zip`)),
    );
    const entries = execFileSync(
      "unzip",
      ["-Z1", join(output, `${host}.zip`)],
      { encoding: "utf8" },
    ).split("\n");
    expect(entries).toContain("skills/setup/SKILL.md");
    expect(entries).toContain("skills/account-overview/SKILL.md");
    expect(entries).not.toContain("evals.json");
  }
  const skill = join(root, "packages/plugins/skills/setup/SKILL.md");
  writeFileSync(
    skill,
    readFileSync(skill, "utf8") + "\nAdditional instructions.\n",
  );
  expect(() => releasePlugins({ root, output })).toThrow(
    "Commit release sources",
  );
  expect(() => releasePlugins({ root, output, allowDirty: true })).toThrow(
    "Bump",
  );
  expect(
    JSON.parse(readFileSync(join(output, "release.json"), "utf8")),
  ).toEqual(first);
});

test("requires version bumps against existing Git release tags", () => {
  configure();
  const { root, output } = fixture();
  commitFixture(root);
  git(root, "tag", "plugins-v0.1.0");
  releasePlugins({ root, output });
  const skill = join(root, "packages/plugins/skills/setup/SKILL.md");
  writeFileSync(skill, readFileSync(skill, "utf8") + "\nChanged skill.\n");
  expect(() =>
    releasePlugins({ root, output: `${output}-new`, allowDirty: true }),
  ).toThrow("different release sources");
});

test("platform checks do not write, and breaking contracts preserve all accepted outputs", async () => {
  configure("");
  const { root } = fixture();
  const dir = join(root, "packages/backend/convex");
  mkdirSync(dir, { recursive: true });
  const functions = resolve("packages/disposabl-kit/server/lib/functions.ts");
  writeFileSync(
    join(dir, "fixture.ts"),
    `import { internalQuery, identityFields } from ${JSON.stringify(functions)};\nexport const read = internalQuery({ args: identityFields, returns: identityFields.orgId, platforms: ["api", "mcp"], handler: async () => "ok" });\n`,
  );
  // This fixture has its own accepted contract; no repository contract is edited.
  rmSync(join(root, "generated/openapi.json"));
  await expect(generatePlatforms(dir, false, { check: true })).rejects.toThrow(
    "out of date",
  );
  expect(readFiles(join(root, "generated")).size).toBe(0);
  await generatePlatforms(dir);
  await generatePlatforms(dir, false, { check: true });
  const specPath = join(root, "generated/openapi.json");
  const before = JSON.parse(readFileSync(specPath, "utf8"));
  before.paths["/api/v1/fixture/removed"] = {
    post: {
      ...before.paths["/api/v1/fixture/read"].post,
      operationId: "fixture:removed",
    },
  };
  writeFileSync(specPath, json(before));
  const generated = filesDigest(readFiles(join(root, "generated")));
  const registry = readFileSync(join(dir, "platforms.generated.ts"), "utf8");
  await expect(generatePlatforms(dir)).rejects.toMatchObject({
    report: { code: "PLATFORM_BREAKING_CHANGE_APPROVAL_REQUIRED" },
  });
  expect(filesDigest(readFiles(join(root, "generated")))).toBe(generated);
  expect(readFileSync(join(dir, "platforms.generated.ts"), "utf8")).toBe(
    registry,
  );
});
