import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import spec from "../../../generated/openapi.json";

const session = mock(
  async (
    _config: unknown,
    _command: string,
    _display?: (url: string, code: string) => void,
  ) => "session-token",
);
import { buildCli, runCli } from "../../disposabl-kit/src/cli";
const config = {
  name: "disposabl",
  version: "0.1.0",
  baseUrl: "https://api.example.test",
  clientId: "client_test",
};
const originalFetch = globalThis.fetch;
const originalLog = console.log;
const originalError = console.error;
let output: unknown[] = [];
let diagnostics: unknown[] = [];
beforeEach(() => {
  console.log = (...args) => {
    output.push(args);
  };
  console.error = (...args) => {
    diagnostics.push(args);
  };
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  console.log = originalLog;
  console.error = originalError;
  session.mockClear();
  output = [];
  diagnostics = [];
  process.exitCode = 0;
});
const invoke = (args: string[], document: any = spec) =>
  buildCli(document, config, { session }).parseAsync(args, { from: "user" });
test("discovers all HTTP operations and whoami", () => {
  const cli = buildCli(spec, config);
  expect(cli.commands.flatMap((c) => c.commands).length).toBe(Object.keys(spec.paths).length);
  expect(cli.commands.some((c) => c.name() === "whoami")).toBe(true);
});
test("help and version never authenticate", async () => {
  for (const flag of ["--help", "--version"]) {
    await expect(invoke([flag])).rejects.toHaveProperty("exitCode", 0);
  }
  expect(session).not.toHaveBeenCalled();
});
test("POST uses field flags, bearer API key, timeout and redirect protection", async () => {
  const request = mock(async () => Response.json({ id: "todo_1" }));
  globalThis.fetch = request as unknown as typeof fetch;
  await invoke(["--api-key", "key", "todo", "create-todo", "--text", "hello"]);
  const [url, options] = request.mock.calls[0] as unknown as [
    string,
    RequestInit,
  ];
  expect(url).toBe("https://api.example.test/api/v1/todo/createTodo");
  expect(options).toMatchObject({
    method: "POST",
    redirect: "error",
    body: '{"text":"hello"}',
    headers: { Authorization: "Bearer key" },
  });
  expect(options.signal).toBeInstanceOf(AbortSignal);
  expect(output).toEqual([['{"id":"todo_1"}']]);
  expect(session).not.toHaveBeenCalled();
});
test("nested object and union validate before obtaining credentials", async () => {
  globalThis.fetch = mock(async () => Response.json([])) as unknown as typeof fetch;
  await invoke([
    "--api-key",
    "key",
    "account",
    "list-members",
    "--pagination-opts",
    '{"numItems":10,"cursor":null}',
  ]);
  await invoke([
    "--api-key",
    "key",
    "account",
    "send-invitation",
    "--email",
    "x",
    "--role-slug",
    "member",
  ]);
  await expect(
    invoke([
      "account",
      "send-invitation",
      "--email",
      "x",
      "--role-slug",
      "owner",
    ]),
  ).rejects.toThrow();
  await expect(
    invoke([
      "todo",
      "create-todo",
      "--data",
      '{"text":"x","orgId":"untrusted"}',
    ]),
  ).rejects.toThrow();
  await expect(invoke(["todo", "create-todo"])).rejects.toThrow();
  expect(session).not.toHaveBeenCalled();
});
test("whoami uses the session token and makes a GET without a body", async () => {
  const request = mock(async () => Response.json({ userId: "u" }));
  globalThis.fetch = request as unknown as typeof fetch;
  await invoke(["whoami"]);
  expect(session.mock.calls[0]?.[1]).toBe("token");
  expect((request.mock.calls[0] as any)[1]).toMatchObject({
    method: "GET",
    headers: { Authorization: "Bearer session-token" },
  });
  expect((request.mock.calls[0] as any)[1].body).toBeUndefined();
});
test("login and logout call the session provider and no-open reaches display hook", async () => {
  session.mockImplementationOnce(async (_c, _a, display) => {
    display?.("https://login.test", "ABCD");
    return "";
  });
  const display = mock(() => {});
  await buildCli(spec, config, { display, session }).parseAsync(
    ["--no-open", "login"],
    { from: "user" },
  );
  expect(display).toHaveBeenCalledWith("https://login.test", "ABCD", false);
  await invoke(["logout"]);
  expect(session.mock.calls.map((c) => c[1])).toEqual(["login", "logout"]);
});
test("rejects insecure origins and mixed input before any fetch or session", async () => {
  await expect(invoke(["--url", "http://evil.test", "whoami"])).rejects.toThrow(
    "HTTPS",
  );
  await expect(
    invoke(["--url", "https://api.test/prefix", "whoami"]),
  ).rejects.toThrow("HTTPS");
  await expect(
    invoke(["todo", "create-todo", "--data", '{"text":"x"}', "--text", "y"]),
  ).rejects.toThrow("either");
  expect(session).not.toHaveBeenCalled();
});
test("reserved property flags fall back to validated JSON", async () => {
  const document = {
    paths: {
      "/api/v1/foo/create": {
        post: {
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { url: { type: "string" } },
                  required: ["url"],
                  additionalProperties: false,
                },
              },
            },
          },
        },
      },
    },
  };
  globalThis.fetch = mock(async () =>
    Response.json({ ok: true }),
  ) as unknown as typeof fetch;
  const cli = buildCli(document, config);
  expect(
    cli.commands
      .find((c) => c.name() === "foo")!
      .commands[0]!.options.map((o) => o.long),
  ).toEqual(["--data"]);
  await invoke(
    ["--api-key", "key", "foo", "create", "--data", '{"url":"value"}'],
    document,
  );
  expect(() =>
    buildCli({ paths: { "/api/v1/login/create": { post: {} } } }, config),
  ).toThrow("Reserved");
});
test("nested and single-segment paths derive commands; prefix collisions fail in either order", async () => {
  const paths = {
    "/api/v1/admin/teams/createTeam": { post: {} },
    "/api/v1/ping": { get: {} },
  };
  globalThis.fetch = mock(async () =>
    Response.json({ ok: true }),
  ) as unknown as typeof fetch;
  await invoke(["--api-key", "key", "admin", "teams", "create-team"], {
    paths,
  });
  await invoke(["--api-key", "key", "ping"], { paths });
  const prefix = ["/api/v1/admin/teams", { post: {} }];
  const nested = ["/api/v1/admin/teams/create", { post: {} }];
  for (const entries of [
    [prefix, nested],
    [nested, prefix],
  ]) {
    expect(() =>
      buildCli({ paths: Object.fromEntries(entries) }, config),
    ).toThrow("collision");
  }
});
test("Commander no-* negations and unsafe property names expose only --data", () => {
  for (const key of ["noCache", "constructor", "prototype", "__proto__"]) {
    const schema = {
      type: "object",
      properties: { [key]: { type: "boolean" } },
    };
    const document = {
      paths: {
        "/api/v1/create": {
          post: {
            requestBody: { content: { "application/json": { schema } } },
          },
        },
      },
    };
    const command = buildCli(document, config).commands.find(
      (c) => c.name() === "create",
    )!;
    expect(command.options.map((o) => o.long)).toEqual(["--data"]);
  }
});
test("HTTP errors set failure status and never print a potentially secret response body", async () => {
  globalThis.fetch = mock(
    async () => new Response("secret", { status: 401 }),
  ) as unknown as typeof fetch;
  await runCli(spec, config, ["bun", "cli", "--api-key", "key", "whoami"], {
    session,
  });
  expect(process.exitCode).toBe(1);
  expect(output).toEqual([]);
  expect(JSON.stringify(diagnostics)).toContain("HTTP 401");
  expect(JSON.stringify(diagnostics)).not.toContain("secret");
});
test("stdin JSON and environment credentials work in a real process", () => {
  const cliPath = new URL(
    "../../disposabl-kit/src/cli/index.ts",
    import.meta.url,
  ).pathname;
  const specPath = new URL("../../../generated/openapi.json", import.meta.url)
    .pathname;
  const script = `
    import { runCli } from ${JSON.stringify(cliPath)};
    import spec from ${JSON.stringify(specPath)};
    globalThis.fetch = async (_url, options) => Response.json({body: JSON.parse(options.body), token: options.headers.Authorization});
    await runCli(spec, ${JSON.stringify(config)}, ["bun", "cli", "todo", "create-todo", "--data", "-"]);
  `;
  const result = Bun.spawnSync([process.execPath, "-e", script], {
    env: { ...process.env, DISPOSABL_API_KEY: "env-key" },
    stdin: Buffer.from('{"text":"from stdin"}'),
  });
  expect(result.exitCode).toBe(0);
  expect(JSON.parse(result.stdout.toString())).toEqual({
    body: { text: "from stdin" },
    token: "Bearer env-key",
  });
});
