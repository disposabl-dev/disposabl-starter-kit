import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import { getPlatforms } from "./lib/platforms";

type Files = Map<string, Buffer>;

export function readFiles(dir: string): Files {
  if (!existsSync(dir)) return new Map();
  return new Map(
    [
      ...new Bun.Glob("**/*").scanSync({
        cwd: dir,
        onlyFiles: true,
        dot: true,
        followSymlinks: false,
      }),
    ]
      .sort()
      .map((path) => {
        const file = join(dir, path);
        if (lstatSync(file).isSymbolicLink())
          throw new Error(`Plugin resources cannot be symlinks: ${path}`);
        return [path, readFileSync(file)];
      }),
  );
}

/** Build both host formats from one manifest and shared skill folders. */
export function buildPlugins({
  root,
  platforms = process.env.DISPOSABL_PLATFORMS ?? "",
  siteUrl = process.env.CONVEX_SITE_URL,
}: {
  root: string;
  platforms?: string;
  siteUrl?: string;
}): Files {
  const enabled = getPlatforms(platforms);
  const files: Files = new Map();
  if (!enabled.isOpenaiPluginEnabled && !enabled.isClaudePluginEnabled)
    return files;
  if (!siteUrl) throw new Error("Set CONVEX_SITE_URL when generating plugins.");
  const url = new URL(siteUrl);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" && !(local && url.protocol === "http:"))
  )
    throw new Error(
      "CONVEX_SITE_URL must be an HTTPS origin, or HTTP localhost for development.",
    );
  const manifest = z
    .object({
      name: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      version: z.string().regex(/^\d+\.\d+\.\d+$/),
      description: z.string().min(1),
      author: z.object({ name: z.string().min(1) }).passthrough(),
    })
    .passthrough()
    .parse(
      JSON.parse(
        readFileSync(join(root, "packages/plugins/plugin.json"), "utf8"),
      ),
    );
  const skills = readFiles(join(root, "packages/plugins/skills"));
  const put = (path: string, value: unknown) =>
    files.set(path, Buffer.from(JSON.stringify(value, null, 2) + "\n"));
  const mcpUrl = new URL("/mcp", url).href;
  if (enabled.isOpenaiPluginEnabled) {
    put("codex/plugin.json", manifest);
    put("codex/mcp.json", {
      $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
      mcpServers: { [manifest.name]: { type: "streamable-http", url: mcpUrl } },
    });
    put(".agents/plugins/marketplace.json", {
      name: `${manifest.name}-plugins`,
      interface: { displayName: manifest.author.name },
      plugins: [
        {
          name: manifest.name,
          source: { source: "local", path: "./codex" },
          policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
          category: "Productivity",
        },
      ],
    });
    for (const [path, data] of skills) files.set(`codex/skills/${path}`, data);
  }
  if (enabled.isClaudePluginEnabled) {
    const { $schema: _schema, extensions: _extensions, ...claude } = manifest;
    put("claude-code/.claude-plugin/plugin.json", claude);
    put("claude-code/.mcp.json", {
      mcpServers: { [manifest.name]: { type: "http", url: mcpUrl } },
    });
    put(".claude-plugin/marketplace.json", {
      name: `${manifest.name}-plugins`,
      description: manifest.description,
      owner: manifest.author,
      plugins: [
        {
          name: manifest.name,
          source: "./claude-code",
          description: manifest.description,
        },
      ],
    });
    for (const [path, data] of skills)
      files.set(`claude-code/skills/${path}`, data);
  }
  return files;
}

/** Own only generated/plugins; --check never writes. */
export function writePlugins(root: string, files: Files, check = false) {
  const output = join(root, "generated/plugins");
  const current = readFiles(output);
  if (
    current.size === files.size &&
    [...files].every(([path, data]) => current.get(path)?.equals(data))
  )
    return;
  if (check)
    throw new Error(
      "Generated plugins are out of date. Run generate:platforms --no-deploy.",
    );
  rmSync(output, { recursive: true, force: true });
  for (const [path, data] of files) {
    const target = join(output, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, data);
  }
}
