import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    config: { type: "string", default: "platforms.config.ts" },
    url: { type: "string" },
  },
});
const configPath = resolve(values.config!);
const config = (await import(pathToFileURL(configPath).href)).default;
if (typeof config.name !== "string" || !/^[a-z][a-z0-9-]*$/.test(config.name))
  throw new Error("Set a lowercase app name in platforms.config.ts.");
const baseUrl = values.url ?? config.baseUrl;
if (typeof baseUrl !== "string" || !baseUrl.trim())
  throw new Error(
    "Set baseUrl in platforms.config.ts or pass --url before generating plugin MCP configuration.",
  );
const origin = new URL(baseUrl);
const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
if (
  (origin.protocol !== "https:" &&
    !(origin.protocol === "http:" && loopback)) ||
  origin.username ||
  origin.password ||
  origin.search ||
  origin.hash ||
  origin.pathname !== "/"
)
  throw new Error(
    "Plugin baseUrl must be an HTTPS origin, or HTTP localhost for development, without credentials, paths, queries, or fragments.",
  );
const url = new URL("/mcp", origin).href;
const root = dirname(configPath);
const plugin = resolve(root, "generated/plugin");
mkdirSync(resolve(plugin, ".claude-plugin"), { recursive: true });
for (const file of ["plugin.json", ".claude-plugin/plugin.json"])
  cpSync(resolve(root, file), resolve(plugin, file));
// Only this generated copy is replaced; app-owned skills remain the source.
rmSync(resolve(plugin, "skills"), { recursive: true, force: true });
cpSync(resolve(root, "skills"), resolve(plugin, "skills"), { recursive: true });
for (const [file, type] of [
  ["mcp.json", "streamable-http"],
  [".mcp.json", "http"],
] as const) {
  const content =
    JSON.stringify(
      {
        ...(file === "mcp.json"
          ? {
              $schema:
                "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
            }
          : {}),
        mcpServers: { [config.name]: { type, url } },
      },
      null,
      2,
    ) + "\n";
  for (const directory of [root, plugin]) {
    const target = resolve(directory, file);
    if (existsSync(target) && readFileSync(target, "utf8") === content)
      continue;
    writeFileSync(target, content);
    console.log(`Generated ${target}`);
  }
}
