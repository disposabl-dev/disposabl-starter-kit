import { Command, Option } from "commander";
import { z } from "zod";
import { sessionToken } from "./session";
import open from "open";
import { runLatest, refreshSkills, exitWith, type Skill } from "./freshness";

type Schema = Exclude<Parameters<typeof z.fromJSONSchema>[0], boolean>;
type Operation = {
  description?: string;
  summary?: string;
  parameters?: unknown[];
  requestBody?: { content?: Record<string, { schema?: Schema }> };
};
export type ApiSpec = { paths: Record<string, Record<string, unknown>> };
export type CliConfig = {
  name: string;
  version: string;
  baseUrl?: string;
  clientId?: string;
  whoamiPath?: string;
  packageName?: string;
  skills?: Skill;
};
const kebab = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
const stringField = (field: Schema): boolean =>
  field.type === "string" ||
  Boolean(
    field.anyOf?.length &&
    field.anyOf.every((branch: Schema) => branch.type === "string"),
  );
const reserved = new Set([
  "help",
  "version",
  "url",
  "client-id",
  "organization",
  "api-key",
  "data",
  "open",
  "no-open",
]);
export type CliHooks = {
  display?: (url: string, code: string, open: boolean) => void;
  session?: typeof sessionToken;
};

function apiOrigin(value?: string): string {
  if (!value)
    throw new Error("Set --url or the CLI's _URL environment variable.");
  const url = new URL(value);
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
  ) {
    throw new Error("Use an HTTPS API origin, or HTTP on localhost.");
  }
  return url.origin;
}

/** Derive commands from the same OpenAPI document consumed by the SDK. */
export function buildCli(
  spec: ApiSpec,
  config: CliConfig,
  hooks: CliHooks = {},
): Command {
  const prefix = config.name.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
  const cli = new Command()
    .name(config.name)
    .version(config.version)
    .exitOverride();
  cli.addOption(
    new Option("--url <origin>", "API origin")
      .env(`${prefix}_URL`)
      .default(config.baseUrl),
  );
  cli.addOption(
    new Option("--client-id <id>", "WorkOS public client ID")
      .env(`${prefix}_CLIENT_ID`)
      .default(config.clientId),
  );
  cli.addOption(
    new Option("--organization <id>", "Organization selected during login").env(
      `${prefix}_ORGANIZATION`,
    ),
  );
  cli.addOption(
    new Option(
      "--api-key <key>",
      `API key; prefer ${prefix}_API_KEY to avoid shell history`,
    ).env(`${prefix}_API_KEY`),
  );
  cli.option("--no-open", "Print device login URL without opening a browser");
  const display = (url: string, code: string) => {
    console.error(`Open ${url}\nConfirm code: ${code}`);
    hooks.display?.(url, code, cli.opts().open !== false);
  };
  const session = async (command: "login" | "logout" | "token") => {
    const options = cli.opts();
    const baseUrl = apiOrigin(options.url);
    if (!options.clientId)
      throw new Error(
        `Set --client-id or ${prefix}_CLIENT_ID for WorkOS login.`,
      );
    return (hooks.session ?? sessionToken)(
      {
        name: config.name,
        baseUrl,
        clientId: options.clientId,
        organizationId: options.organization,
      },
      command,
      display,
    );
  };
  for (const command of ["login", "logout"] as const) {
    cli
      .command(command)
      .description(
        `${command === "login" ? "Create" : "Remove"} the local WorkOS session`,
      )
      .action(async () => {
        await session(command);
        console.log(JSON.stringify({ success: true }));
      });
  }
  const operations = new Set<Command>();
  const addOperation = (
    command: Command,
    path: string,
    method: string,
    operation: Operation,
  ) => {
    if (operation.parameters?.length)
      throw new Error(
        `${path}: parameter operations need an explicit CLI adapter.`,
      );
    const schema = operation.requestBody?.content?.["application/json"]?.schema;
    if (operation.requestBody && !schema)
      throw new Error(`${path}: expected an application/json request schema.`);
    // Zod validates nested objects, required values, unions and unknown fields before authentication.
    const validator = schema ? z.fromJSONSchema(schema) : z.object({}).strict();
    const fields = Object.entries(schema?.properties ?? {}) as [
      string,
      Schema,
    ][];
    const flagNames = fields.map(([key]) => kebab(key));
    const flagsAvailable =
      fields.every(
        ([key]) => !["__proto__", "constructor", "prototype"].includes(key),
      ) &&
      flagNames.every(
        (name) =>
          /^[a-z][a-z0-9-]*$/.test(name) &&
          !name.startsWith("no-") &&
          !reserved.has(name),
      ) &&
      new Set(flagNames).size === flagNames.length;
    command
      .description(
        operation.summary ||
          operation.description ||
          `${method.toUpperCase()} ${path}`,
      )
      .option(
        "--data <json>",
        flagsAvailable
          ? "JSON object, or - to read stdin"
          : "JSON object, or - for stdin; field flags collide with reserved names",
      );
    if (flagsAvailable)
      for (const [key, field] of fields) {
        command.option(
          `--${kebab(key)} <value>`,
          stringField(field) ? key : `${key} as JSON`,
        );
      }
    command.action(async (_options, invoked: Command) => {
      const options = invoked.opts();
      if (
        options.data !== undefined &&
        Object.keys(options).some((key) => key !== "data")
      )
        throw new Error("Use either --data or field flags.");
      let body: unknown = {};
      if (options.data !== undefined) {
        let source = options.data;
        if (source === "-") {
          source = "";
          for await (const chunk of process.stdin) source += chunk;
        }
        body = JSON.parse(source);
      } else if (flagsAvailable) {
        const values: Record<string, unknown> = {};
        for (const [key, field] of fields) {
          const value =
            options[
              kebab(key).replace(/-([a-z])/g, (_, letter: string) =>
                letter.toUpperCase(),
              )
            ];
          if (value !== undefined)
            values[key] = stringField(field) ? value : JSON.parse(value);
        }
        body = values;
      }
      const parsed = validator.parse(body);
      const global = cli.opts();
      const origin = apiOrigin(global.url);
      if (
        (method === "get" || method === "head") &&
        Object.keys(parsed as object).length
      )
        throw new Error(
          "This operation cannot send a JSON body with GET or HEAD.",
        );
      const token = global.apiKey || (await session("token"));
      if (!token || /[\r\n]/.test(token))
        throw new Error("Invalid bearer credential.");
      const response = await fetch(`${origin}${path}`, {
        method: method.toUpperCase(),
        redirect: "error",
        signal: AbortSignal.timeout(30_000),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(method === "get" || method === "head"
          ? {}
          : { body: JSON.stringify(parsed) }),
      });
      // Avoid printing server bodies in diagnostics: a gateway might echo credentials.
      if (!response.ok)
        throw new Error(`API request failed: HTTP ${response.status}.`);
      console.log(
        JSON.stringify(response.status === 204 ? null : await response.json()),
      );
    });
  };
  for (const [path, methods] of Object.entries(spec.paths)) {
    const match = /^\/api\/v1\/(.+)$/.exec(path);
    const raw = match?.[1]?.split("/") ?? [];
    if (
      !raw.length ||
      raw.some((part) => !/^[A-Za-z][A-Za-z0-9_-]*$/.test(part))
    )
      throw new Error(`Unsupported CLI operation path: ${path}`);
    const parts = raw.map(kebab);
    if (
      [
        "login",
        "logout",
        "whoami",
        "dashboard",
        "skills",
        ...reserved,
      ].includes(parts[0]!) ||
      parts.includes("help")
    )
      throw new Error(`Reserved command name in ${path}.`);
    for (const [method, value] of Object.entries(methods)) {
      if (
        !["get", "post", "put", "patch", "delete", "head", "options"].includes(
          method,
        )
      )
        continue;
      let command = cli;
      for (const part of parts) {
        if (operations.has(command))
          throw new Error(`Command/group collision in ${path}.`);
        command =
          command.commands.find((child) => child.name() === part) ??
          command.command(part);
      }
      if (operations.has(command) || command.commands.length)
        throw new Error(
          `Duplicate CLI command or command/group collision in ${path}.`,
        );
      operations.add(command);
      addOperation(command, path, method, value as Operation);
      if (
        path === (config.whoamiPath ?? "/api/v1/account/getAccount") &&
        method === "get"
      )
        addOperation(cli.command("whoami"), path, method, value as Operation);
    }
  }
  return cli;
}

/** Executable entry points call this so operational errors produce a failing exit status. */
export async function runCli(
  spec: ApiSpec,
  config: CliConfig,
  argv = process.argv,
  hooks: CliHooks = {},
): Promise<void> {
  try {
    if (config.packageName) {
      const delegated = await runLatest(
        {
          packageName: config.packageName,
          bin: config.name,
        },
        argv.slice(2),
      );
      if (delegated) return exitWith(delegated);
    }
    const interrupted = await refreshSkills(config.skills ?? null);
    if (interrupted) return exitWith(interrupted);
    const cli = buildCli(spec, config, {
      display: (url, _code, shouldOpen) => {
        if (shouldOpen)
          void open(url).catch(() =>
            console.error("Open the printed URL to continue."),
          );
      },
      ...hooks,
    });
    cli
      .command("skills")
      .description("Install or refresh this app's shared agent skill")
      .action(() => {
        if (!config.skills?.source)
          throw new Error("Set skills.source in platforms.config.ts first.");
        console.log(
          JSON.stringify({
            source: config.skills.source,
            skill: config.skills.skill,
          }),
        );
      });
    cli
      .command("dashboard")
      .description("Show this app's platform links")
      .option("--open", "Open the application in a browser")
      .action(async (options) => {
        const origin = apiOrigin(cli.opts().url);
        console.log(
          JSON.stringify(
            {
              app: origin,
              api: `${origin}/openapi.json`,
              mcp: `${origin}/mcp`,
              skills: config.skills?.source || null,
            },
            null,
            2,
          ),
        );
        if (options.open) await open(origin);
      });
    await cli.parseAsync(argv);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "commander.helpDisplayed" || code === "commander.version")
      return;
    if (!code?.startsWith("commander."))
      console.error(error instanceof Error ? error.message : "Command failed.");
    process.exitCode = 1;
  }
}
