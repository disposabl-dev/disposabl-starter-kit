import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import semver from "semver";

type Result = {
  code: number | null;
  signal: NodeJS.Signals | null;
  timedOut?: boolean;
};
type ExecuteOptions = {
  env?: NodeJS.ProcessEnv;
  stderrOnly?: boolean;
  timeoutMs?: number;
  spawnImpl?: typeof spawn;
  signals?: NodeJS.Process;
};
type Options = {
  env?: NodeJS.ProcessEnv;
  executeImpl?: typeof execute;
  warning?: (message: string) => void;
};
type Release = { packageName: string; bin: string };
export type Skill = { source: string; skill: string; toolVersion?: string };

const packagePattern = /^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]*$/;
const warn = (message: string) => {
  process.stderr.write(`${message}\n`);
};
const guardKey = (name: string) =>
  `DISPOSABL_LATEST_${createHash("sha256").update(name).digest("hex").slice(0, 16)}`;

// Inherited streams keep prompts and piped output intact. The caller exits with this result.
export function execute(
  args: string[],
  {
    env = process.env,
    stderrOnly = false,
    timeoutMs,
    spawnImpl = spawn,
    signals = process,
  }: ExecuteOptions = {},
): Promise<Result> {
  return new Promise((resolve, reject) => {
    const detached = process.platform !== "win32";
    const child = spawnImpl("npm", args, {
      env,
      stdio: stderrOnly ? ["inherit", 2, 2] : "inherit",
      shell: false,
      detached,
    });
    const kill = (signal: NodeJS.Signals) => {
      try {
        if (detached && child.pid) process.kill(-child.pid, signal);
        else child.kill(signal);
      } catch {
        /* Already exited. */
      }
    };
    let timedOut = false;
    let interrupted: NodeJS.Signals | null = null;
    const timer = timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          kill("SIGKILL");
        }, timeoutMs)
      : undefined;
    const handlers = (["SIGINT", "SIGTERM", "SIGHUP"] as const).map(
      (signal) => {
        const handler = () => {
          interrupted ??= signal;
          kill(signal);
        };
        signals.on(signal, handler);
        return [signal, handler] as const;
      },
    );
    const cleanup = () => {
      clearTimeout(timer);
      handlers.forEach(([signal, handler]) => signals.off(signal, handler));
    };
    child.once("error", (error) => {
      cleanup();
      reject(error);
    });
    child.once("exit", (code, signal) => {
      cleanup();
      resolve({
        code,
        signal: timedOut ? signal : (interrupted ?? signal),
        ...(timedOut ? { timedOut } : {}),
      });
    });
  });
}

// Delegate every installed invocation; npm owns latest resolution and caching.
// The guard skips only the nested invocation, so its skill refresh still runs.
export async function runLatest(
  { packageName, bin }: Release,
  argv: string[],
  { env = process.env, executeImpl = execute }: Options = {},
): Promise<Result | null> {
  if (!packagePattern.test(packageName) || !/^[a-zA-Z0-9][\w.-]*$/.test(bin))
    throw new Error("Invalid CLI release configuration");
  const key = guardKey(packageName);
  if (
    env.DISPOSABL_CLI_DEV === "1" ||
    env.DISPOSABL_NO_UPDATE === "1" ||
    env[key] === "1"
  )
    return null;
  // Never retry locally after delegation: the command may already have performed work.
  return executeImpl(
    [
      "exec",
      "--yes",
      "--prefer-online",
      `--package=${packageName}@latest`,
      "--",
      bin,
      ...argv,
    ],
    { env: { ...env, [key]: "1" } },
  );
}

// The source must contain only this product's skill. Never run `skills update` here.
export async function refreshSkills(
  config: Skill | null,
  { env = process.env, executeImpl = execute, warning = warn }: Options = {},
): Promise<Result | undefined> {
  if (
    !config?.source ||
    env.DISPOSABL_CLI_DEV === "1" ||
    env.DISPOSABL_SKIP_SKILLS === "1"
  )
    return;
  const { source, skill, toolVersion = "1.7.2" } = config;
  if (
    typeof source !== "string" ||
    !source ||
    source.startsWith("-") ||
    !/^[\w.-]+$/.test(skill) ||
    !semver.valid(toolVersion)
  )
    throw new Error("Invalid skills configuration");
  try {
    const result = await executeImpl(
      [
        "exec",
        "--yes",
        "--prefer-online",
        `--package=skills@${toolVersion}`,
        "--",
        "skills",
        "add",
        source,
        "--skill",
        skill,
        "--agent",
        "codex",
        "--agent",
        "claude-code",
        "--global",
        "--yes",
      ],
      { env, stderrOnly: true, timeoutMs: 30_000 },
    );
    if (result.signal && !result.timedOut) return result;
    if (result.code !== 0 || result.timedOut)
      warning(
        "Could not refresh the shared skill; continuing with the available skill.",
      );
  } catch {
    warning(
      "Could not refresh the shared skill; continuing with the available skill.",
    );
  }
}

export function exitWith({ code, signal }: Result): void {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
}
