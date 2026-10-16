import { afterEach, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdir, utimes } from "node:fs/promises";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  sessionToken,
  type SessionConfig,
} from "../../disposabl-kit/src/cli/session";

const originalFetch = globalThis.fetch;
const directories: string[] = [];
afterEach(async () => {
  globalThis.fetch = originalFetch;
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});
async function config(): Promise<SessionConfig> {
  const directory = await mkdtemp(join(tmpdir(), "cli-session-test-"));
  directories.push(directory);
  return {
    name: "test-app",
    baseUrl: "https://example.com",
    clientId: "client_123",
    directory,
  };
}
function file(config: SessionConfig) {
  const key = createHash("sha256")
    .update(JSON.stringify([new URL(config.baseUrl).origin, config.clientId]))
    .digest("hex");
  return join(config.directory!, `${key}.json`);
}
async function seed(
  config: SessionConfig,
  organizationId: string | undefined = "org_123",
) {
  await writeFile(
    file(config),
    JSON.stringify({
      clientId: config.clientId,
      refreshToken: "refresh1",
      organizationId,
    }),
    { mode: 0o600 },
  );
}
function reply(value: unknown, status = 200) {
  return Response.json(value, { status });
}
function mockFetch(
  callback: (
    body: URLSearchParams,
    url: string,
  ) => Promise<Response> | Response,
) {
  globalThis.fetch = (async (
    url: string | URL | Request,
    options?: RequestInit,
  ) =>
    callback(
      new URLSearchParams(String(options?.body)),
      String(url),
    )) as typeof fetch;
}
const token = (organization_id = "org_123", refresh_token = "refresh2") => ({
  access_token: "access",
  refresh_token,
  organization_id,
});

test("refresh rotates private credentials without storing access token", async () => {
  const c = await config();
  await seed(c);
  mockFetch((body) => {
    expect(body.get("refresh_token")).toBe("refresh1");
    expect(body.get("organization_id")).toBe("org_123");
    expect(body.has("client_secret")).toBe(false);
    return reply(token());
  });
  expect(await sessionToken(c, "token")).toBe("access");
  const saved = await readFile(file(c), "utf8");
  expect(saved).toContain("refresh2");
  expect(saved).not.toContain("access");
  expect((await stat(file(c))).mode & 0o777).toBe(0o600);
  expect(await readdir(c.directory!)).toEqual([file(c).split("/").at(-1)!]);
});
test("invalid grant removes stale credentials; transient failure preserves them", async () => {
  const c = await config();
  await seed(c);
  mockFetch(() => reply({ error: "server_error" }, 503));
  await expect(sessionToken(c, "token")).rejects.toThrow("Unable to refresh");
  expect(await readFile(file(c), "utf8")).toContain("refresh1");
  mockFetch(() => reply({ error: "invalid_grant" }, 400));
  await expect(sessionToken(c, "token")).rejects.toThrow("Unable to refresh");
  expect(await readdir(c.directory!)).toEqual([]);
});
test("origin and client IDs isolate credentials; logout is local and idempotent", async () => {
  const c = await config();
  await seed(c);
  mockFetch(() => {
    throw new Error("must not fetch");
  });
  await expect(
    sessionToken({ ...c, clientId: "client_456" }, "token"),
  ).rejects.toThrow("Run login");
  await expect(
    sessionToken({ ...c, baseUrl: "https://other.example.com" }, "token"),
  ).rejects.toThrow("Run login");
  await sessionToken(c, "logout");
  await sessionToken(c, "logout");
  expect(await readdir(c.directory!)).toEqual([]);
});
test("organization mismatch fails before refresh; returned mismatch is never saved", async () => {
  const c = await config();
  await seed(c);
  mockFetch(() => {
    throw new Error("must not fetch");
  });
  await expect(
    sessionToken({ ...c, organizationId: "org_other" }, "token"),
  ).rejects.toThrow("Organization changed");
  mockFetch(() => reply(token("org_other")));
  await expect(sessionToken(c, "token")).rejects.toThrow(
    "different organization",
  );
  expect(await readFile(file(c), "utf8")).toContain("refresh1");
});
test("concurrent refreshes serialize and use the latest rotated token", async () => {
  const c = await config();
  await seed(c);
  const received: string[] = [];
  mockFetch(async (body) => {
    received.push(body.get("refresh_token")!);
    await new Promise((resolve) => setTimeout(resolve, 20));
    return reply(token("org_123", `refresh${received.length + 1}`));
  });
  await Promise.all([sessionToken(c, "token"), sessionToken(c, "token")]);
  expect(received).toEqual(["refresh1", "refresh2"]);
});
test("device login displays public code and selects requested organization", async () => {
  const c = await config();
  const shown: string[] = [];
  mockFetch((body, url) => {
    if (url.endsWith("authorize/device"))
      return reply({
        device_code: "secret-device-code",
        user_code: "ABCD",
        verification_uri: "https://login.example.com/device",
        expires_in: 30,
        interval: 1,
      });
    if (body.get("grant_type") === "refresh_token") {
      expect(body.get("organization_id")).toBe("org_selected");
      return reply(token("org_selected"));
    }
    return reply({ access_token: "initial", refresh_token: "initial-refresh" });
  });
  expect(
    await sessionToken(
      { ...c, organizationId: "org_selected" },
      "login",
      (url, code) => shown.push(url, code),
    ),
  ).toBe("access");
  expect(shown).toEqual(["https://login.example.com/device", "ABCD"]);
});
test("device deadline prevents polling after expiry; malformed intervals fail", async () => {
  const c = await config();
  let requests = 0;
  mockFetch(() => {
    requests++;
    return reply({
      device_code: "device",
      user_code: "CODE",
      verification_uri: "https://login.example.com/device",
      expires_in: 0.01,
      interval: 1,
    });
  });
  await expect(sessionToken(c, "login", () => {})).rejects.toThrow("timed out");
  expect(requests).toBe(1);
  mockFetch(() =>
    reply({
      device_code: "device",
      user_code: "CODE",
      verification_uri: "https://login.example.com/device",
      expires_in: 10,
      interval: -1,
    }),
  );
  await expect(sessionToken(c, "login", () => {})).rejects.toThrow(
    "Unable to start",
  );
});

test("device slow_down increases the next poll interval", async () => {
  const c = await config();
  const polls: number[] = [];
  mockFetch((_body, url) => {
    if (url.endsWith("authorize/device"))
      return reply({
        device_code: "device",
        user_code: "CODE",
        verification_uri: "https://login.example.com/device",
        expires_in: 30,
        interval: 1,
      });
    polls.push(Date.now());
    return polls.length === 1
      ? reply({ error: "slow_down" }, 400)
      : reply(token());
  });
  await sessionToken(c, "login", () => {});
  expect(polls.length).toBe(2);
  expect(polls[1]! - polls[0]!).toBeGreaterThanOrEqual(5900);
}, 12_000);

test("recovers a stale lock left behind by an interrupted process", async () => {
  const c = await config();
  await seed(c);
  const lock = `${file(c)}.lock`;
  await mkdir(lock);
  const stale = new Date(Date.now() - 60_000);
  await utimes(lock, stale, stale);
  mockFetch(() => reply(token()));
  expect(await sessionToken(c, "token")).toBe("access");
  expect(await readdir(c.directory!)).toEqual([file(c).split("/").at(-1)!]);
});

test("browser login does not lock credential reads or local logout", async () => {
  const c = await config();
  await seed(c);
  let deletedDuringLogin = false;
  mockFetch((_body, url) => {
    if (url.endsWith("authorize/device"))
      return reply({
        device_code: "device",
        user_code: "CODE",
        verification_uri: "https://login.example.com/device",
        expires_in: 30,
        interval: 1,
      });
    return reply(token());
  });
  const signedIn = sessionToken(c, "login", () => {
    void sessionToken(c, "logout").then(() => {
      deletedDuringLogin = true;
    });
  });
  await signedIn;
  expect(deletedDuringLogin).toBe(true);
  expect(await readFile(file(c), "utf8")).toContain("refresh2");
});
