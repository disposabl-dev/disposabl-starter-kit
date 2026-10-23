#!/usr/bin/env bun
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { z } from "zod";
import {
  buildPlugins,
  digest,
  filesDigest,
  json,
  pluginVersion,
  type PluginContract,
} from "./generate-plugins";

const releaseIdentity = z.object({
  version: pluginVersion,
  contentSha256: z.string().regex(/^[0-9a-f]{64}$/),
});

export function compareVersions(a: string, b: string) {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const delta = left[i]! - right[i]!;
    if (delta) return Math.sign(delta);
  }
  return 0;
}

export function checkReleaseVersion(
  next: { version: string; contentSha256: string },
  previous: { version: string; contentSha256: string },
) {
  const order = compareVersions(next.version, previous.version);
  if (order < 0)
    throw new Error(
      `Plugin version ${next.version} precedes ${previous.version}.`,
    );
  if (!order && next.contentSha256 !== previous.contentSha256)
    throw new Error(
      `Plugin ${next.version} has changed. Bump packages/plugins/plugin.json before releasing.`,
    );
}

/** Produce candidate artifacts. This command never publishes or deploys. */
export function releasePlugins({
  root = resolve("."),
  output = resolve("dist/plugins"),
  previous,
  allowDirty = false,
}: {
  root?: string;
  output?: string;
  previous?: string;
  allowDirty?: boolean;
} = {}) {
  const git = (...args: string[]) =>
    execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
  const dirty = Boolean(
    git("status", "--porcelain", "--untracked-files=normal"),
  );
  if (dirty && !allowDirty)
    throw new Error(
      "Commit release sources first, or use --allow-dirty for local candidate testing.",
    );
  const contract: PluginContract = JSON.parse(
    readFileSync(join(root, "generated/openapi.json"), "utf8"),
  );
  const bundle = buildPlugins({ root, contract });
  if (!bundle)
    throw new Error(
      "Enable openai-plugin and/or claude-plugin in DISPOSABL_PLATFORMS.",
    );
  const { manifest } = bundle;
  const changelog = readFileSync(
    join(root, "packages/plugins/CHANGELOG.md"),
    "utf8",
  );
  if (!changelog.split(/\r?\n/).includes(`## ${manifest.version}`))
    throw new Error(`Add CHANGELOG.md release notes for ${manifest.version}.`);
  const identity = {
    version: manifest.version,
    contentSha256: filesDigest(bundle.files),
  };
  const previousPath = previous ?? join(output, "release.json");
  if (existsSync(previousPath))
    checkReleaseVersion(
      identity,
      releaseIdentity.parse(JSON.parse(readFileSync(previousPath, "utf8"))),
    );
  else if (previous)
    throw new Error(`Previous release record does not exist: ${previous}`);
  const tags = git("tag", "--list", "plugins-v*")
    .split("\n")
    .filter((tag) => /^plugins-v\d+\.\d+\.\d+$/.test(tag));
  for (const tag of tags) {
    const version = tag.slice("plugins-v".length);
    if (compareVersions(manifest.version, version) < 0)
      throw new Error(`Plugin version must not precede released ${tag}.`);
    if (
      manifest.version === version &&
      git(
        "diff",
        tag,
        "--",
        "packages/plugins",
        "generated/openapi.json",
        "packages/disposabl-kit/server/generate-plugins.ts",
        "packages/disposabl-kit/server/release-plugins.ts",
      )
    )
      throw new Error(
        `${tag} already exists with different release sources. Bump the plugin version.`,
      );
  }
  const stage = mkdtempSync(join(tmpdir(), "disposabl-plugin-release-"));
  try {
    const packages: Record<string, { sha256: string }> = {};
    const archives = new Map<string, Uint8Array>();
    for (const host of ["codex", "claude-code"]) {
      const paths: string[] = [];
      for (const [path, data] of bundle.files) {
        if (!path.startsWith(`${host}/`)) continue;
        const target = join(stage, path);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, data);
        chmodSync(target, 0o644);
        utimesSync(
          target,
          new Date("2000-01-01T00:00:00Z"),
          new Date("2000-01-01T00:00:00Z"),
        );
        paths.push(path.slice(host.length + 1));
      }
      if (!paths.length) continue;
      const archive = join(stage, `${host}.zip`);
      execFileSync("zip", ["-X", "-q", archive, ...paths.sort()], {
        cwd: join(stage, host),
        env: { ...process.env, TZ: "UTC" },
      });
      const bytes = readFileSync(archive);
      packages[host] = { sha256: digest(bytes) };
      archives.set(`${host}.zip`, bytes);
    }
    const record = {
      schemaVersion: 1,
      name: manifest.name,
      ...identity,
      sourceCommit: git("rev-parse", "HEAD"),
      dirty,
      siteUrl: bundle.siteUrl,
      contractSha256: digest(json(contract)),
      skills: bundle.skills,
      packages,
    };
    mkdirSync(output, { recursive: true });
    // Remove only stale archives owned by this command when a host is disabled.
    for (const host of ["codex", "claude-code"])
      if (!packages[host]) rmSync(join(output, `${host}.zip`), { force: true });
    for (const [path, bytes] of archives)
      writeFileSync(join(output, path), bytes);
    writeFileSync(join(output, "release.json"), json(record));
    console.info(
      `Built plugin ${manifest.version} candidate artifacts in ${output}.`,
    );
    return record;
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  let output: string | undefined;
  let previous: string | undefined;
  let allowDirty = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--allow-dirty") allowDirty = true;
    else if (["--output", "--previous"].includes(arg!)) {
      const value = args[++i];
      if (!value || value.startsWith("--"))
        throw new Error(`${arg} needs a path.`);
      if (arg === "--output") output = resolve(value);
      else previous = resolve(value);
    } else
      throw new Error(
        "Usage: bun run plugins:release [--output path] [--previous release.json] [--allow-dirty]",
      );
  }
  releasePlugins({ output, previous, allowDirty });
}
