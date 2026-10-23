#!/usr/bin/env bun
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { runOasdiffBreakingFromSpecs } from "@oasdiff-js/oasdiff-js";
import { createHttp } from "./http";

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

/** Check compatibility before replacing either generated artifact. */
export async function generatePlatforms(
  dir = resolve("convex"),
  acceptBreaking = false,
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
  for (const [path, value] of [
    [registry.target, registry.content],
    [target, content],
  ] as const) {
    if (existsSync(path) && readFileSync(path, "utf8") === value) continue;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(`${path}.tmp`, value);
    renameSync(`${path}.tmp`, path);
  }
  console.info("Generated platform registry and OpenAPI specification.");
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--accept-breaking"))
    throw new Error("Usage: bun run generate:platforms [--accept-breaking]");
  try {
    await generatePlatforms(
      resolve("convex"),
      args.includes("--accept-breaking"),
    );
  } catch (error) {
    if (!(error instanceof BreakingChangeApprovalRequired)) throw error;
    console.error(JSON.stringify(error.report));
    process.exit(2);
  }
  // Do not deploy changed functions before the compatibility check passes.
  const deployment = Bun.spawn(["bun", "run", "convex", "dev", "--once"], {
    stdout: "inherit",
    stderr: "inherit",
  });
  if ((await deployment.exited) !== 0)
    throw new Error("Convex deployment failed");
}
