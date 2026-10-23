import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { z } from "zod";
import { getPlatforms } from "./lib/platforms";

export const pluginVersion = z
  .string()
  .regex(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/,
    "Use a stable semantic version, such as 0.1.0",
  );
const manifestSchema = z
  .object({
    $schema: z.literal(
      "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    ),
    name: z
      .string()
      .max(64)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    version: pluginVersion,
    description: z.string().min(1),
    author: z
      .object({
        name: z.string().min(1),
        email: z.string().optional(),
        url: z.string().optional(),
      })
      .strict(),
    homepage: z.url().optional(),
    repository: z.string().optional(),
    license: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    extensions: z
      .record(z.string(), z.record(z.string(), z.unknown()))
      .optional(),
  })
  .strict();
const skillSchema = z
  .object({
    name: z
      .string()
      .max(64)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    description: z.string().min(1).max(1024),
    metadata: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();

export type PluginFiles = Map<string, Uint8Array>;
export type PluginContract = { "x-mcp-tools": Record<string, unknown> };
export type PluginBundle = {
  manifest: z.infer<typeof manifestSchema>;
  files: PluginFiles;
  skills: Record<string, string>;
  siteUrl: string;
};
export const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
export const digest = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");

/** Read only regular files; packaged resources must remain self-contained. */
export function readFiles(dir: string, prefix = ""): PluginFiles {
  const files: PluginFiles = new Map();
  if (!existsSync(dir)) return files;
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    const relative = prefix ? `${prefix}/${name}` : name;
    const stat = lstatSync(path);
    if (stat.isSymbolicLink())
      throw new Error(`Plugin resources cannot be symlinks: ${relative}`);
    if (stat.isDirectory()) {
      for (const entry of readFiles(path, relative)) files.set(...entry);
    } else if (stat.isFile()) files.set(relative, readFileSync(path));
    else throw new Error(`Unsupported plugin resource: ${relative}`);
  }
  return files;
}

export function filesDigest(files: PluginFiles) {
  return digest(
    json(
      [...files]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([path, data]) => [path, digest(data)]),
    ),
  );
}

/** Assemble candidates in memory before the platform compatibility gate writes. */
export function buildPlugins({
  root,
  platforms = process.env.DISPOSABL_PLATFORMS ?? "",
  siteUrl = process.env.CONVEX_SITE_URL,
  contract,
}: {
  root: string;
  platforms?: string;
  siteUrl?: string;
  contract: PluginContract;
}): PluginBundle | undefined {
  const enabled = getPlatforms(platforms);
  if (!enabled.isOpenaiPluginEnabled && !enabled.isClaudePluginEnabled) return;
  if (!siteUrl)
    throw new Error(
      "Set CONVEX_SITE_URL to the target deployment when generating plugins.",
    );
  const url = new URL(siteUrl);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      ))
  )
    throw new Error(
      "CONVEX_SITE_URL must be an HTTPS origin, or HTTP localhost for development.",
    );
  const source = resolve(root, "packages/plugins");
  const manifest = manifestSchema.parse(
    JSON.parse(readFileSync(join(source, "plugin.json"), "utf8")),
  );
  const resources = readFiles(join(source, "skills"));
  const skills: Record<string, string> = {};
  for (const [path, data] of resources) {
    if (!/^[^/]+\/SKILL\.md$/.test(path)) continue;
    const text = new TextDecoder().decode(data);
    const header = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!header) throw new Error(`${path}: missing skill frontmatter`);
    const skill = skillSchema.parse(Bun.YAML.parse(header[1]!));
    if (skill.name !== path.split("/")[0])
      throw new Error(`${path}: skill name must match its directory`);
    const required =
      skill.metadata?.["required-tools"]?.split(/\s+/).filter(Boolean) ?? [];
    for (const tool of required)
      if (!Object.hasOwn(contract["x-mcp-tools"], tool))
        throw new Error(
          `${path}: required MCP tool ${tool} is not in the accepted contract`,
        );
    skills[skill.name] = filesDigest(
      new Map(
        [...resources].filter(([file]) => file.startsWith(`${skill.name}/`)),
      ),
    );
  }
  if (!Object.keys(skills).length)
    throw new Error("Add at least one skill to packages/plugins/skills.");
  for (const path of resources.keys())
    if (!Object.hasOwn(skills, path.split("/")[0]!))
      throw new Error(`${path}: resource has no sibling SKILL.md`);
  const files: PluginFiles = new Map();
  const put = (path: string, value: unknown) =>
    files.set(path, new TextEncoder().encode(json(value)));
  const server = manifest.name;
  const mcpUrl = new URL("/mcp", url).href;
  if (enabled.isOpenaiPluginEnabled) {
    put("codex/plugin.json", manifest);
    put("codex/mcp.json", {
      $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
      mcpServers: { [server]: { type: "streamable-http", url: mcpUrl } },
    });
    put(".agents/plugins/marketplace.json", {
      name: `${server}-plugins`,
      interface: { displayName: manifest.author.name },
      plugins: [
        {
          name: server,
          source: { source: "local", path: "./codex" },
          policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
          category: "Productivity",
        },
      ],
    });
  }
  if (enabled.isClaudePluginEnabled) {
    const {
      name,
      version,
      description,
      author,
      homepage,
      repository,
      license,
    } = manifest;
    put("claude-code/.claude-plugin/plugin.json", {
      name,
      version,
      description,
      author,
      homepage,
      repository,
      license,
    });
    put("claude-code/.mcp.json", {
      mcpServers: { [server]: { type: "http", url: mcpUrl } },
    });
    put(".claude-plugin/marketplace.json", {
      name: `${server}-plugins`,
      description: manifest.description,
      owner: author,
      plugins: [{ name, source: "./claude-code", description }],
    });
  }
  for (const host of ["codex", "claude-code"]) {
    if (![...files.keys()].some((path) => path.startsWith(`${host}/`)))
      continue;
    for (const [path, data] of resources)
      files.set(`${host}/skills/${path}`, data);
    files.set(
      `${host}/CHANGELOG.md`,
      readFileSync(join(source, "CHANGELOG.md")),
    );
  }
  return { manifest, files, skills, siteUrl: url.origin };
}

/** Check or replace only the generator-owned plugin output directory. */
export function writePlugins(
  root: string,
  bundle?: PluginBundle,
  check = false,
) {
  const output = resolve(root, "generated/plugins");
  const expected = bundle?.files ?? new Map<string, Uint8Array>();
  const current = readFiles(output);
  if (filesDigest(current) === filesDigest(expected)) return;
  if (check)
    throw new Error(
      "Generated plugins are out of date. Run generate:platforms --no-deploy with the same target and flags.",
    );
  rmSync(output, { recursive: true, force: true });
  for (const [path, data] of expected) {
    const target = join(output, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, data);
  }
}
