// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";
import { spawn, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";

const generator = resolve("../disposabl-kit/src/generate-platforms.ts");
const functions = resolve("../disposabl-kit/src/server/lib/functions.ts");
const values = createRequire(import.meta.url).resolve("convex/values");
const cleanup: (() => void | Promise<void>)[] = [];
afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) await close();
});

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "api-functions-"));
  cleanup.push(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, "_generated"));
  const source = join(dir, "_generated/api.d.ts");
  const target = join(dir, "apiFunctions.ts");
  const output = join(dir, "generated");
  const spec = join(output, "openapi.json");
  const write = (name: string, content: string) =>
    writeFileSync(join(dir, name), content);
  const run = () =>
    spawnSync("bun", [generator, dir, output, "--once"], { encoding: "utf8" });
  const snapshot = () => [
    readFileSync(target, "utf8"),
    readFileSync(spec, "utf8"),
    readFileSync(join(output, "typescript/sdk.gen.ts"), "utf8"),
    readFileSync(join(output, "typescript/types.gen.ts"), "utf8"),
  ];
  const definition = (
    args = "text: v.string()",
    platforms = '["api"]',
    returns = "v.null()",
  ) => `
import { createFunctions } from ${JSON.stringify(functions)};
import { v } from ${JSON.stringify(values)};
const { internalMutation } = createFunctions();
export const save = internalMutation({ platforms: ${platforms}, args: { ${args} }, returns: ${returns}, handler: () => null });
`;
  const start = () => {
    const child = spawn("bun", [
      "--watch",
      "--no-clear-screen",
      generator,
      dir,
      output,
    ]);
    let logs = "";
    child.stdout.on("data", (chunk) => {
      logs += chunk;
    });
    child.stderr.on("data", (chunk) => {
      logs += chunk;
    });
    cleanup.push(
      () =>
        new Promise<void>((done) => {
          child.once("close", () => done());
          child.kill();
        }),
    );
    return () => logs;
  };
  write(
    "_generated/api.d.ts",
    'import type * as example from "../example.js";\n',
  );
  write("example.ts", definition());
  return {
    dir,
    source,
    target,
    output,
    spec,
    write,
    run,
    snapshot,
    definition,
    start,
  };
}

test("generates locally, filters modules, and preserves unchanged files", () => {
  const f = fixture();
  f.write(
    "_generated/api.d.ts",
    `import type * as example from "../example.js";
import type * as http from "../http.js";
import type * as self from "../apiFunctions.js";
import type * as node from "../node.js";
import type * as deleted from "../deleted.js";
`,
  );
  f.write("node.ts", '"use node"; export const example = true;');
  expect(f.run().status).toBe(0);
  expect(readFileSync(f.target, "utf8")).toContain(
    'import * as example from "./example.js"',
  );
  expect(readFileSync(f.target, "utf8")).not.toMatch(
    /from "\.\/(http|apiFunctions|node|deleted)\.js"/,
  );
  const spec = JSON.parse(readFileSync(f.spec, "utf8"));
  expect(Object.keys(spec.paths)).toEqual(["/api/v1/example/save"]);
  expect(
    readFileSync(join(f.output, "typescript/sdk.gen.ts"), "utf8"),
  ).toContain("exampleSave");
  const modified = [statSync(f.target).mtimeMs, statSync(f.spec).mtimeMs];
  expect(f.run().status).toBe(0);
  expect([statSync(f.target).mtimeMs, statSync(f.spec).mtimeMs]).toEqual(
    modified,
  );
});

test.each([
  ["argument removed", ""],
  ["argument renamed", "name: v.string()"],
  ["argument type changed", "text: v.number()"],
  ["required argument added", "text: v.string(), count: v.number()"],
])("rejects %s without changing either output", (_name, args) => {
  const f = fixture();
  expect(f.run().status).toBe(0);
  const before = f.snapshot();
  f.write("example.ts", f.definition(args));
  const result = f.run();
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("API compatibility check failed");
  expect(result.stderr).toContain("/api/v1/example/save");
  expect(f.snapshot()).toEqual(before);
});

test.each(["delete", "unexpose", "response"])("rejects API %s", (change) => {
  const f = fixture();
  expect(f.run().status).toBe(0);
  const before = f.snapshot();
  if (change === "delete") rmSync(join(f.dir, "example.ts"));
  if (change === "unexpose")
    f.write("example.ts", f.definition("text: v.string()", '["mcp"]'));
  if (change === "response")
    f.write(
      "example.ts",
      f.definition("text: v.string()", '["api"]', "v.string()"),
    );
  expect(f.run().status).not.toBe(0);
  expect(f.snapshot()).toEqual(before);
});

test("accepts optional arguments, new operations, and MCP-only changes", () => {
  const f = fixture();
  const customDir = join(f.dir, "packages/sdk");
  mkdirSync(customDir, { recursive: true });
  const custom = "export const customHelper = () => 'preserved';\n";
  writeFileSync(join(customDir, "index.ts"), custom);
  expect(f.run().status).toBe(0);
  f.write(
    "example.ts",
    f.definition("text: v.string(), count: v.optional(v.number())") +
      "\nexport const second = save;",
  );
  expect(f.run().status).toBe(0);
  expect(
    Object.keys(JSON.parse(readFileSync(f.spec, "utf8")).paths),
  ).toHaveLength(2);
  f.write("tool.ts", f.definition("text: v.number()", '["mcp"]'));
  f.write(
    "_generated/api.d.ts",
    readFileSync(f.source, "utf8") +
      'import type * as tool from "../tool.js";\n',
  );
  expect(f.run().status).toBe(0);
  f.write("tool.ts", f.definition("", '["mcp"]'));
  expect(f.run().status).toBe(0);
  rmSync(join(f.dir, "tool.ts"));
  expect(f.run().status).toBe(0);
  expect(readFileSync(join(customDir, "index.ts"), "utf8")).toBe(custom);
});

test("invalid baseline fails closed", () => {
  const f = fixture();
  expect(f.run().status).toBe(0);
  writeFileSync(f.spec, "broken JSON");
  const before = f.snapshot();
  expect(f.run().status).not.toBe(0);
  expect(f.snapshot()).toEqual(before);
});

test("bootstraps before codegen and begins watching when declarations appear", async () => {
  const f = fixture();
  rmSync(f.source);
  f.start();
  await vi.waitFor(() =>
    expect(readFileSync(f.target, "utf8")).toContain("export const modules"),
  );
  f.write(
    "_generated/api.d.ts",
    'import type * as example from "../example.js";\n',
  );
  await vi.waitFor(() =>
    expect(readFileSync(f.spec, "utf8")).toContain("/api/v1/example/save"),
  );
  f.write(
    "example.ts",
    f.definition("text: v.string(), count: v.optional(v.number())"),
  );
  await vi.waitFor(() =>
    expect(readFileSync(f.spec, "utf8")).toContain('"count"'),
  );
});

test("Bun watch reloads transitive validators, reports failures, and recovers", async () => {
  const f = fixture();
  f.write(
    "fields.ts",
    `import { v } from ${JSON.stringify(values)}; export const fields = { text: v.string() };`,
  );
  f.write(
    "example.ts",
    'import { fields } from "./fields";\n' + f.definition("...fields"),
  );
  expect(f.run().status).toBe(0);
  const before = f.snapshot();
  const logs = f.start();
  // Wait until the watched process has loaded all modules and finished checking.
  await vi.waitFor(() => expect(logs()).toContain("API spec checked."), {
    timeout: 5000,
  });
  f.write(
    "fields.ts",
    `import { v } from ${JSON.stringify(values)}; export const fields = { text: v.number() };`,
  );
  await vi.waitFor(
    () => expect(logs()).toContain("API compatibility check failed"),
    { timeout: 5000 },
  );
  expect(f.snapshot()).toEqual(before);
  f.write(
    "fields.ts",
    `import { v } from ${JSON.stringify(values)}; export const fields = { text: v.string(), count: v.optional(v.number()) };`,
  );
  await vi.waitFor(
    () => expect(readFileSync(f.spec, "utf8")).toContain('"count"'),
    { timeout: 5000 },
  );
  f.write("other.ts", "export const untouched = true;");
  f.write(
    "_generated/api.d.ts.tmp",
    readFileSync(f.source, "utf8") +
      'import type * as other from "../other.js";\n',
  );
  renameSync(`${f.source}.tmp`, f.source);
  await vi.waitFor(
    () => expect(readFileSync(f.target, "utf8")).toContain('"./other.js"'),
    { timeout: 5000 },
  );
  // The watch must follow subsequent replacements, not just the first new inode.
  f.write(
    "_generated/api.d.ts.tmp",
    readFileSync(f.source, "utf8").replace(
      'import type * as other from "../other.js";\n',
      "",
    ),
  );
  renameSync(`${f.source}.tmp`, f.source);
  await vi.waitFor(
    () => expect(readFileSync(f.target, "utf8")).not.toContain('"./other.js"'),
    { timeout: 5000 },
  );
}, 30_000);

test("unchanged generation preserves SDK files and custom SDK code, and recovers missing output", () => {
  const f = fixture();
  expect(f.run().status).toBe(0);
  const sdk = join(f.output, "typescript");
  const customPath = join(sdk, "custom.ts");
  const custom = "export const customHelper = () => 'preserved';\n";
  writeFileSync(customPath, custom);
  const mtimes = () =>
    Object.fromEntries(
      readdirSync(sdk, { recursive: true })
        .map(String)
        .filter((file) => statSync(join(sdk, file)).isFile())
        .map((file) => [file, statSync(join(sdk, file)).mtimeMs]),
    );
  const before = mtimes();
  expect(f.run().status).toBe(0);
  expect(mtimes()).toEqual(before);
  expect(readFileSync(customPath, "utf8")).toBe(custom);
  rmSync(join(sdk, "sdk.gen.ts"));
  expect(f.run().status).toBe(0);
  expect(readFileSync(join(sdk, "sdk.gen.ts"), "utf8")).toContain(
    "exampleSave",
  );
});
