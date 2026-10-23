#!/usr/bin/env bun
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { runOasdiffBreakingFromSpecs } from "@oasdiff-js/oasdiff-js";
import { createHttp } from "./http";
import { z } from "zod";
import { getPlatforms } from "./lib/platforms";

const output = "platforms.generated.ts";
const extensions = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".mjs",
  ".cts",
  ".cjs",
];

/** Build candidate artifacts without replacing the last accepted generation. */
async function generateRegistry(dir: string) {
  const target = resolve(dir, output);
  const modules = [
    ...new Bun.Glob("**/*").scanSync({ cwd: dir, onlyFiles: true }),
  ]
    .filter((file) => {
      const parts = file.split("/");
      const name = parts.at(-1)!;
      if (
        parts.some(
          (part) =>
            ["_generated", "_deps", "node_modules"].includes(part) ||
            part.startsWith(".") ||
            part.startsWith("#"),
        )
      )
        return false;
      if (
        !extensions.some((ext) => file.endsWith(ext)) ||
        name.split(".").length !== 2 ||
        ["schema.ts", "schema.js"].includes(name)
      )
        return false;
      if (file.replace(/\.[^.]+$/, "") === "http") return false;
      // Convex does not deploy files belonging to nested components as app modules.
      if (
        parts
          .slice(0, -1)
          .some((_, i) =>
            existsSync(
              resolve(dir, ...parts.slice(0, i + 1), "convex.config.ts"),
            ),
          )
      )
        return false;
      const source = readFileSync(resolve(dir, file), "utf8");
      if (/^\s*["']use node["']/m.test(source)) return false;
      return !/\.tsx?$/.test(file) || /^\s{0,100}(import|export)/m.test(source);
    })
    .sort()
    .map((file, i) => ({
      name: `module_${i}`,
      path: file.replace(/\.[^.]+$/, ""),
    }));
  const content = `// Generated from local Convex modules. Do not edit.
${modules.map(({ name, path }) => `import * as ${name} from ${JSON.stringify(`./${path}`)};`).join("\n")}

export const modules = {${modules.length ? "\n" : ""}${modules.map(({ name, path }) => `  ${/^[a-zA-Z_$][\w$]*$/.test(path) ? path : JSON.stringify(path)}: ${name},\n`).join("")}};
`;
  const exports: Record<string, Record<string, unknown>> = {};
  for (const { path } of modules)
    exports[path] = await import(pathToFileURL(resolve(dir, path)).href);
  return { target, content, modules: exports };
}

type PlatformSpec = Awaited<
  ReturnType<ReturnType<typeof createHttp>["openapi"]>
>;

class BreakingChangeApprovalRequired extends Error {
  constructor(
    readonly report: {
      code: "PLATFORM_BREAKING_CHANGE_APPROVAL_REQUIRED";
      approvalRequired: true;
      command: string;
      files: string[];
      changes: string[];
    },
  ) {
    super(
      `Platform compatibility check failed. Generated files were kept.\n${report.changes.join("\n")}\nExplicit approval is required before running ${report.command}.`,
    );
  }
}

function mcpSpec(spec: PlatformSpec) {
  return {
    openapi: spec.openapi,
    info: spec.info,
    components: spec.components,
    paths: Object.fromEntries(
      Object.entries(spec["x-mcp-tools"]).map(([name, tool]) => [
        `/mcp/tools/${name}`,
        {
          post: {
            operationId: name,
            requestBody: {
              required: true,
              content: { "application/json": { schema: tool.inputSchema } },
            },
            responses: {
              "200": {
                description: "Success",
                content: { "application/json": { schema: tool.outputSchema } },
              },
            },
          },
        },
      ]),
    ),
  };
}

type Files = Map<string, Buffer>;

function readFiles(dir: string): Files {
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
function buildPlugins(root: string): Files {
  const enabled = getPlatforms();
  const files: Files = new Map();
  if (!enabled.isOpenaiPluginEnabled && !enabled.isClaudePluginEnabled)
    return files;
  const siteUrl = process.env.CONVEX_SITE_URL;
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

/** Validate every candidate before checking or replacing generated artifacts. */
export async function generatePlatforms(
  dir = resolve("convex"),
  acceptBreaking = false,
  { check = false }: { check?: boolean } = {},
) {
  const registry = await generateRegistry(dir);
  const spec = await createHttp({ modules: registry.modules }).openapi();
  const content = JSON.stringify(spec, null, 2) + "\n";
  const target = resolve(dir, "../../../generated/openapi.json");
  if (existsSync(target) && readFileSync(target, "utf8") !== content) {
    const previous: PlatformSpec = JSON.parse(readFileSync(target, "utf8"));
    const comparisons: { name: string; before: object; after: object }[] = [
      { name: "API", before: previous, after: spec },
    ];
    if (previous["x-mcp-tools"])
      comparisons.push({
        name: "MCP",
        before: mcpSpec(previous),
        after: mcpSpec(spec),
      });
    const breaking: string[] = [];
    for (const { name, before, after } of comparisons) {
      const result = await runOasdiffBreakingFromSpecs(before, after, {
        failOn: "WARN",
      });
      if (result.exitCode === 0) continue;
      // An unavailable or failed checker is never an intentional breaking change.
      if (!result.changes.length)
        throw new Error(
          `${name} compatibility checker failed. Generated files were kept.\n${result.stderr}`,
        );
      breaking.push(
        `${name}:\n${result.changes.map((change) => `${change.path ?? ""} ${change.text ?? change.id}`).join("\n")}`,
      );
    }
    for (const [name, tool] of Object.entries(previous["x-mcp-tools"] ?? {})) {
      if (
        tool.readOnlyHint &&
        spec["x-mcp-tools"][name]?.readOnlyHint === false
      )
        breaking.push(`MCP: ${name} is no longer read-only.`);
    }
    if (breaking.length) {
      const report = {
        code: "PLATFORM_BREAKING_CHANGE_APPROVAL_REQUIRED" as const,
        approvalRequired: true as const,
        command: "bun run generate:platforms --accept-breaking",
        files: [registry.target, target],
        changes: breaking,
      };
      if (!acceptBreaking) throw new BreakingChangeApprovalRequired(report);
      console.warn(
        `Accepting intentional breaking changes:\n${breaking.join("\n")}`,
      );
      console.warn(
        JSON.stringify({
          ...report,
          code: "PLATFORM_BREAKING_CHANGES_ACCEPTED",
          approvalRequired: false,
        }),
      );
    }
  }
  const root = resolve(dir, "../../..");
  const pluginDir = join(root, "generated/plugins");
  const plugins = buildPlugins(root);
  const artifacts: Files = new Map([
    [registry.target, Buffer.from(registry.content)],
    [target, Buffer.from(content)],
    ...[...plugins].map(([path, data]): [string, Buffer] => [
      join(pluginDir, path),
      data,
    ]),
  ]);
  const stalePlugins = [...readFiles(pluginDir).keys()].some(
    (path) => !plugins.has(path),
  );
  const changed = [...artifacts].filter(
    ([path, data]) => !existsSync(path) || !readFileSync(path).equals(data),
  );
  if (check) {
    if (stalePlugins || changed.length)
      throw new Error(
        "Generated platform artifacts are out of date. Run generate:platforms --no-deploy.",
      );
    console.info("Generated platform artifacts are up to date.");
    return;
  }
  if (stalePlugins) rmSync(pluginDir, { recursive: true, force: true });
  for (const [path, data] of artifacts) {
    if (existsSync(path) && readFileSync(path).equals(data)) continue;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(`${path}.tmp`, data);
    renameSync(`${path}.tmp`, path);
  }
  console.info(
    "Generated platform registry, OpenAPI specification, and enabled plugins.",
  );
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (
    args.some(
      (arg) => !["--accept-breaking", "--no-deploy", "--check"].includes(arg),
    )
  )
    throw new Error(
      "Usage: bun run generate:platforms [--accept-breaking] [--no-deploy | --check]",
    );
  if (args.includes("--check") && args.includes("--accept-breaking"))
    throw new Error("--check cannot accept breaking changes.");
  try {
    await generatePlatforms(
      resolve("convex"),
      args.includes("--accept-breaking"),
      { check: args.includes("--check") },
    );
  } catch (error) {
    if (!(error instanceof BreakingChangeApprovalRequired)) throw error;
    console.error(JSON.stringify(error.report));
    process.exit(2);
  }
  if (args.includes("--check") || args.includes("--no-deploy")) process.exit(0);
  // Do not deploy changed functions before the compatibility check passes.
  const deployment = Bun.spawn(["bun", "run", "convex", "dev", "--once"], {
    stdout: "inherit",
    stderr: "inherit",
  });
  if ((await deployment.exited) !== 0)
    throw new Error("Convex deployment failed");
}
