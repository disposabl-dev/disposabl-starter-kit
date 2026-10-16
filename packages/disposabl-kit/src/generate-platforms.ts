import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { runOasdiffBreakingFromSpecs } from "@oasdiff-js/oasdiff-js";
import { createClient } from "@hey-api/openapi-ts";
import { generateOpenApi } from "./server/http";

export async function generateApiFunctions(
  dir: string,
  outputDir: string,
  acceptBreaking = false,
) {
  const source = resolve(dir, "_generated/api.d.ts");
  const target = resolve(dir, "apiFunctions.ts");
  // Import as text so Bun --watch tracks codegen as well as the modules below.
  const declarations: string = existsSync(source)
    ? (await import(source, { with: { type: "text" } })).default
    : "";
  const imports = declarations
    .split("\n")
    .filter((line) => line.startsWith("import type * as "))
    .filter(
      (line) =>
        !["http", "apiFunctions"].some((name) =>
          line.includes(`"../${name}.js"`),
        ),
    );
  // HTTP cannot import Node actions; deleted files may still be in stale codegen.
  const exports: Record<string, Record<string, unknown>> = {};
  const modules: string[] = [];
  for (const line of imports) {
    const modulePath = resolve(dir, line.split('"')[1]!.slice(3, -3));
    const source = ".ts .tsx .js .jsx .mts .mjs .cts .cjs"
      .split(" ")
      .map((extension) => modulePath + extension)
      .find(existsSync);
    if (!source || /^\s*["']use node["']/m.test(readFileSync(source, "utf8")))
      continue;
    exports[line.split('"')[1]!.slice(3, -3)] = await import(source);
    modules.push(line);
  }
  const content = `// Generated from _generated/api.d.ts. Do not edit.
${modules.map((line) => line.replace("import type", "import").replace('"../', '"./')).join("\n")}

// prettier-ignore
export const modules = {
${modules.map((line) => `  "${line.split('"')[1]!.slice(3, -3)}": ${line.split(" ")[4]},`).join("\n")}
};
`;
  const specPath = resolve(outputDir, "openapi.json");
  const spec = await generateOpenApi(exports);
  const specText = `${JSON.stringify(spec, null, 2)}\n`;
  const unchanged =
    existsSync(specPath) && readFileSync(specPath, "utf8") === specText;
  if (existsSync(specPath) && !unchanged) {
    const result = await runOasdiffBreakingFromSpecs(
      JSON.parse(readFileSync(specPath, "utf8")),
      spec,
      { failOn: "WARN", format: "text" },
    );
    if (result.exitCode !== 0 && !acceptBreaking)
      throw new Error(
        `API compatibility check failed; generated files were kept.\n${result.stdout}${result.stderr}\nFor an intentional API version change, run once with --accept-breaking and add a release changeset.`,
      );
  }
  const sdkOutput = resolve(outputDir, "typescript");
  const sdkExists = ["sdk.gen.ts", "types.gen.ts", "client.gen.ts"].every(
    (file) => existsSync(resolve(sdkOutput, file)),
  );
  if (!unchanged || !sdkExists)
    await createClient({ input: spec, output: sdkOutput });
  // Neither accepted output changes until compatibility and SDK generation pass.
  mkdirSync(outputDir, { recursive: true });
  let changed = false;
  for (const [path, value] of [
    [target, content],
    [specPath, specText],
  ] as const) {
    if (existsSync(path) && readFileSync(path, "utf8") === value) continue;
    writeFileSync(path, value);
    changed = true;
  }
  return changed;
}

if (import.meta.main) {
  const [dir = "convex", outputDir = "../../generated"] = process.argv
    .slice(2)
    .filter((arg) => !["--once", "--accept-breaking"].includes(arg));
  const acceptBreaking = process.argv.includes("--accept-breaking");
  if (acceptBreaking && !process.argv.includes("--once"))
    throw new Error(
      "--accept-breaking requires --once; watch mode must keep checking compatibility.",
    );
  await generateApiFunctions(dir, outputDir, acceptBreaking);
  // On a first checkout, let convex dev create its declaration file first.
  if (
    !existsSync(resolve(dir, "_generated/api.d.ts")) &&
    !process.argv.includes("--once")
  ) {
    while (!existsSync(resolve(dir, "_generated/api.d.ts")))
      await Bun.sleep(250);
    await generateApiFunctions(dir, outputDir);
  }
  console.info("API spec checked.");
}
