# Agent plugin configuration

The root portable plugin and Claude plugin share `skills/`. Skills remain app-owned Git files and can change without publishing a new `@disposabl/cli` release.

Set the public production origin in `platforms.config.ts`, then generate the installable package and its host-specific MCP files:

```sh
bun packages/disposabl-kit/src/generate-plugins.ts
```

For a local development endpoint, override the URL without changing the app configuration:

```sh
bun packages/disposabl-kit/src/generate-plugins.ts --url http://localhost:3211
```

An alternate app configuration is supported. Generated files are written beside that configuration:

```sh
bun packages/disposabl-kit/src/generate-plugins.ts --config /absolute/path/to/platforms.config.ts
```

Both marketplaces install `generated/plugin/`, which contains only the two plugin manifests, the shared skills, and the two MCP files. The generator copies app-owned root manifests and `skills/` into this directory; it replaces the generated skills copy to remove obsolete files. It never packages the monorepo or `node_modules`. Root MCP files are also retained for project integrations.

The generator requires an HTTPS origin, or HTTP localhost for development. It rejects blank origins, embedded credentials, paths, query strings, and fragments. It appends `/mcp` and only writes files whose contents changed. Do not publish development configuration as production configuration.

OpenAI discovers root `mcp.json` using the portable schema and `streamable-http` transport. Claude discovers root `.mcp.json` using its `http` transport. Both files contain the same concrete endpoint. Keeping two small files avoids assuming that portable OpenAI plugins support Claude's `${ENV_VAR}` URL expansion. No secrets are generated or committed. Complete the host's supported OAuth connection flow after installation.

After generating, commit `generated/plugin/` along with the marketplace descriptors when publishing the plugin repository. Regenerate after editing root manifests, app-owned skills, or the configured origin. Native clients may require a plugin refresh and a new session or reload to use changed MCP configuration. A generated URL does not prove authentication or tool calls work; verify those against the selected deployment.

Sources: [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins), [portable MCP schema](https://agent-plugins.org/schemas/1.0.0/mcp.schema.json), and [Claude MCP configuration](https://code.claude.com/docs/en/mcp).

Install the published marketplace with `codex plugin marketplace add disposabl-dev/disposabl-starter-kit`, then `codex plugin add disposabl@disposabl`. In Claude Code, use `/plugin install disposabl --marketplace disposabl-dev/disposabl-starter-kit`.
