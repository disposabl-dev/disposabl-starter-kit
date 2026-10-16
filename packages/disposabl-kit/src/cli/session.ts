import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { lock } from "proper-lockfile";
import { join } from "node:path";

export type SessionConfig = {
  name: string;
  baseUrl: string;
  clientId: string;
  organizationId?: string;
  directory?: string;
};
type Tokens = {
  access_token: string;
  refresh_token: string;
  organization_id?: string;
};
type Saved = {
  clientId: string;
  refreshToken: string;
  organizationId?: string;
};
type Display = (url: string, code: string) => void;
const endpoint = "https://api.workos.com/user_management";

async function post(values: Record<string, string>, path = "authenticate") {
  const response = await fetch(`${endpoint}/${path}`, {
    method: "POST",
    redirect: "error",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(values),
    signal: AbortSignal.timeout(30_000),
  });
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("WorkOS returned an invalid response.");
  return { response, data: data as Record<string, unknown> };
}
function tokens(data: Record<string, unknown>): Tokens {
  if (
    typeof data.access_token !== "string" ||
    typeof data.refresh_token !== "string"
  )
    throw new Error("WorkOS returned an invalid session.");
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    ...(typeof data.organization_id === "string"
      ? { organization_id: data.organization_id }
      : {}),
  };
}
async function refresh(
  clientId: string,
  refreshToken: string,
  organizationId?: string,
) {
  const { response, data } = await post({
    client_id: clientId,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    ...(organizationId ? { organization_id: organizationId } : {}),
  });
  if (!response.ok)
    throw Object.assign(
      new Error("Unable to refresh WorkOS login. Run login again."),
      {
        invalidGrant: data.error === "invalid_grant",
      },
    );
  return tokens(data);
}
async function login(clientId: string, display: Display) {
  const { response, data } = await post(
    { client_id: clientId },
    "authorize/device",
  );
  if (
    !response.ok ||
    typeof data.device_code !== "string" ||
    typeof data.user_code !== "string" ||
    typeof data.verification_uri !== "string" ||
    typeof data.expires_in !== "number" ||
    !Number.isFinite(data.expires_in) ||
    data.expires_in <= 0 ||
    typeof data.interval !== "number" ||
    !Number.isFinite(data.interval) ||
    data.interval <= 0
  )
    throw new Error("Unable to start WorkOS login.");
  const url = new URL(
    typeof data.verification_uri_complete === "string"
      ? data.verification_uri_complete
      : data.verification_uri,
  );
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error("Invalid WorkOS verification URL.");
  display(url.href, data.user_code);
  const deadline = Date.now() + Math.min(data.expires_in, 900) * 1000;
  let interval = Math.max(1, data.interval) * 1000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, interval));
    if (Date.now() >= deadline) break;
    const result = await post({
      client_id: clientId,
      device_code: data.device_code,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    });
    if (result.response.ok) return tokens(result.data);
    if (result.data.error === "slow_down") interval += 5000;
    else if (result.data.error !== "authorization_pending")
      throw new Error("WorkOS login failed or was denied. Run login again.");
  }
  throw new Error("WorkOS login timed out. Run login again.");
}
/** Refresh tokens stay local; access tokens are returned only to the caller. */
export async function sessionToken(
  config: SessionConfig,
  command: "login" | "logout" | "token",
  display: Display = (url, code) =>
    console.error(`Open ${url}\nConfirm code: ${code}`),
): Promise<string> {
  const { clientId, organizationId } = config;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(config.name))
    throw new Error("Invalid CLI name.");
  if (!/^client_[a-zA-Z0-9]+$/.test(clientId))
    throw new Error("Invalid WorkOS client ID.");
  if (
    organizationId !== undefined &&
    !/^org_[a-zA-Z0-9]+$/.test(organizationId)
  )
    throw new Error("Invalid organization ID.");
  const url = new URL(config.baseUrl);
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      ))
  )
    throw new Error("Use an HTTPS API origin, or HTTP on localhost.");
  const directory =
    config.directory ??
    join(
      process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
      config.name,
    );
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const info = await lstat(directory);
  if (
    !info.isDirectory() ||
    info.isSymbolicLink() ||
    (process.platform !== "win32" && (info.mode & 0o077) !== 0)
  )
    throw new Error("CLI session directory must be private, mode 0700.");
  const key = createHash("sha256")
    .update(JSON.stringify([url.origin, clientId]))
    .digest("hex");
  const file = join(directory, `${key}.json`);
  let result = command === "login" ? await login(clientId, display) : undefined;
  const release = await lock(file, {
    realpath: false,
    stale: 10_000,
    update: 2_000,
    retries: { retries: 110, factor: 1, minTimeout: 100, maxTimeout: 100 },
  });
  try {
    if (command === "logout") {
      await unlink(file).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      });
      return "";
    }
    if (result) {
      if (organizationId && result.organization_id !== organizationId)
        result = await refresh(clientId, result.refresh_token, organizationId);
    } else {
      let saved: Saved;
      try {
        const source = await open(
          file,
          constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
        );
        try {
          const stat = await source.stat();
          if (
            !stat.isFile() ||
            (process.platform !== "win32" && (stat.mode & 0o077) !== 0)
          )
            throw new Error("CLI session file must be private.");
          saved = JSON.parse(await source.readFile("utf8")) as Saved;
        } finally {
          await source.close();
        }
      } catch {
        throw new Error("Run login first.");
      }
      if (
        !saved ||
        saved.clientId !== clientId ||
        typeof saved.refreshToken !== "string" ||
        (saved.organizationId !== undefined &&
          !/^org_[a-zA-Z0-9]+$/.test(saved.organizationId))
      )
        throw new Error("Invalid saved session. Run login again.");
      if (organizationId && organizationId !== saved.organizationId)
        throw new Error(
          "Organization changed. Run login with the selected organization.",
        );
      try {
        result = await refresh(
          clientId,
          saved.refreshToken,
          saved.organizationId,
        );
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "invalidGrant" in error &&
          error.invalidGrant
        )
          await unlink(file);
        throw error;
      }
      if (result.organization_id !== saved.organizationId)
        throw new Error(
          "WorkOS returned a different organization. Run login again.",
        );
    }
    if (organizationId && result.organization_id !== organizationId)
      throw new Error("WorkOS did not select the requested organization.");
    if (
      result.organization_id !== undefined &&
      !/^org_[a-zA-Z0-9]+$/.test(result.organization_id)
    )
      throw new Error("WorkOS returned an invalid organization.");
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
      await writeFile(
        temporary,
        JSON.stringify({
          clientId,
          refreshToken: result.refresh_token,
          organizationId: result.organization_id,
        } satisfies Saved),
        { mode: 0o600, flag: "wx" },
      );
      await rename(temporary, file);
    } finally {
      await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      });
    }
    return result.access_token;
  } finally {
    await release();
  }
}
