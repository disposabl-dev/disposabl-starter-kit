import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import {
  execute,
  runLatest,
  refreshSkills,
} from "../../disposabl-kit/src/cli/freshness.ts";

const config = {
  packageName: "@disposabl/cli",
  version: "1.0.0",
  bin: "disposabl",
};
test("every invocation delegates latest, preserves arguments and status, and skips nested delegation", async () => {
  let invocation;
  const result = await runLatest(config, ["build", "a b", "--token=$literal"], {
    env: {},
    executeImpl: async (args, options) => {
      invocation = { args, options };
      return { code: 17, signal: null };
    },
  });
  assert.equal(result.code, 17);
  assert.deepEqual(invocation.args, [
    "exec",
    "--yes",
    "--prefer-online",
    "--package=@disposabl/cli@latest",
    "--",
    "disposabl",
    "build",
    "a b",
    "--token=$literal",
  ]);
  assert.equal(
    await runLatest(config, [], {
      env: invocation.options.env,
      executeImpl: () => assert.fail("recursive delegation"),
    }),
    null,
  );
});

test("delegation guards are package scoped and invalid package or bin cannot become npm options", async () => {
  let env;
  await runLatest(config, [], {
    env: {},
    executeImpl: async (_args, options) => {
      env = options.env;
      return { code: 0, signal: null };
    },
  });
  let calls = 0;
  await runLatest({ ...config, packageName: "@other/cli" }, [], {
    env,
    executeImpl: async () => {
      calls++;
      return { code: 0, signal: null };
    },
  });
  assert.equal(calls, 1);
  for (const overrides of [
    { packageName: "--install-danger" },
    { bin: "--eval" },
  ]) {
    await assert.rejects(
      runLatest({ ...config, ...overrides }, [], {
        env: {},
        executeImpl: () => assert.fail("invalid execution"),
      }),
      /Invalid CLI release/,
    );
  }
});

test("explicit offline or pinned mode skips update but still permits scoped skills refresh", async () => {
  const env = { DISPOSABL_NO_UPDATE: "1" };
  assert.equal(
    await runLatest(config, [], {
      env,
      executeImpl: () => assert.fail("update"),
    }),
    null,
  );
  let calls = 0;
  await refreshSkills(
    { source: "org/repo", skill: "product" },
    {
      env,
      executeImpl: async () => {
        calls++;
        return { code: 0, signal: null };
      },
    },
  );
  assert.equal(calls, 1);
});

test("delegation failure propagates without executing the command a second time", async () => {
  let attempts = 0;
  await assert.rejects(
    runLatest(config, [], {
      env: {},
      executeImpl: async () => {
        attempts++;
        throw new Error("failed");
      },
    }),
    /failed/,
  );
  assert.equal(attempts, 1);
});

test("explicit development mode skips all network and install work", async () => {
  const env = { DISPOSABL_CLI_DEV: "1" };
  assert.equal(
    await runLatest(config, [], {
      env,
      fetchImpl: () => assert.fail("network"),
    }),
    null,
  );
  await refreshSkills(
    { source: "org/repo", skill: "product", toolVersion: "1.0.0" },
    { env, executeImpl: () => assert.fail("install") },
  );
});

test("skills refresh is scoped, independent of CLI version, and keeps stdout clean", async () => {
  let invocation;
  await refreshSkills(
    { source: "org/repo", skill: "product", toolVersion: "1.5.0" },
    {
      env: {},
      executeImpl: async (args, options) => {
        invocation = { args, options };
        return { code: 0, signal: null };
      },
    },
  );
  assert.deepEqual(invocation.args, [
    "exec",
    "--yes",
    "--prefer-online",
    "--package=skills@1.5.0",
    "--",
    "skills",
    "add",
    "org/repo",
    "--skill",
    "product",
    "--agent",
    "codex",
    "--agent",
    "claude-code",
    "--global",
    "--yes",
  ]);
  assert.equal(invocation.options.stderrOnly, true);
  assert.equal(invocation.options.timeoutMs, 30_000);
});

test("skills failure warns, interruption propagates, and unconfigured skills skip", async () => {
  const skills = { source: "org/repo", skill: "product", toolVersion: "1.5.0" };
  let warnings = 0;
  await refreshSkills(skills, {
    executeImpl: async () => ({ code: 1 }),
    warning: () => warnings++,
  });
  assert.equal(warnings, 1);
  assert.deepEqual(
    await refreshSkills(skills, {
      executeImpl: async () => ({ code: null, signal: "SIGINT" }),
    }),
    { code: null, signal: "SIGINT" },
  );
  await refreshSkills(null, { executeImpl: () => assert.fail("install") });
  await refreshSkills(
    { ...skills, source: "" },
    { executeImpl: () => assert.fail("install") },
  );
});

test("skill timeout warns and continues; pinned installer defaults to current release", async () => {
  let warnings = 0;
  assert.equal(
    await refreshSkills(
      { source: "org/repo", skill: "product" },
      {
        warning: () => warnings++,
        executeImpl: async (args) => {
          assert.ok(args.includes("--package=skills@1.7.2"));
          return { code: null, signal: "SIGKILL", timedOut: true };
        },
      },
    ),
    undefined,
  );
  assert.equal(warnings, 1);
});

test("runner deadline kills stalled child and reports timeout", async () => {
  const signals = new EventEmitter();
  const child = new EventEmitter();
  child.kill = (signal) => {
    child.emit("exit", null, signal);
  };
  assert.deepEqual(
    await execute([], { signals, timeoutMs: 5, spawnImpl: () => child }),
    { code: null, signal: "SIGKILL", timedOut: true },
  );
});

test("child runner forwards signals, inherits stdio, and removes signal handlers", async () => {
  const signals = new EventEmitter();
  const child = new EventEmitter();
  const kills = [];
  child.kill = (signal) => kills.push(signal);
  const result = execute(["exec"], {
    env: {},
    signals,
    spawnImpl: (command, args, options) => {
      assert.equal(command, "npm");
      assert.deepEqual(args, ["exec"]);
      assert.equal(options.shell, false);
      assert.equal(options.stdio, "inherit");
      return child;
    },
  });
  signals.emit("SIGINT");
  assert.deepEqual(kills, ["SIGINT"]);
  child.emit("exit", null, "SIGINT");
  assert.deepEqual(await result, { code: null, signal: "SIGINT" });
  assert.equal(signals.listenerCount("SIGINT"), 0);
});
