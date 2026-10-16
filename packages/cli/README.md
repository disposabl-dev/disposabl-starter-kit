# Disposabl CLI

This app owns the package identity and version in `package.json`. The entrypoint
uses `disposabl-kit/cli` to derive commands from root `generated/openapi.json`.
Set the public command name, API origin, WorkOS client ID, and skill source in root
`platforms.config.ts`. Keep secrets out of that file.

The current defaults target the verified development deployment at
`https://courteous-marmot-118.convex.site`. The CLI's `1.0.0` release is intended
to replace the existing `@disposabl/cli` package on npm's `latest` channel. Its
repository is `disposabl-dev/disposabl-starter-kit`; this release does not turn the
configured development deployment into production. Each generated app must choose
its own deployment and package identity before release. The skill source is
currently empty, so automatic skill refresh is inactive.

```sh
bun run cli --help
bun run cli --url https://YOUR-DEPLOYMENT.convex.site --client-id client_YOURS login
bun run cli whoami
bun run cli todo create-todo --help
```

`bun run cli` runs local sources in development mode. Deployment settings can also
come from `DISPOSABL_URL`, `DISPOSABL_CLIENT_ID`, and `DISPOSABL_ORGANIZATION`
(the prefix follows the configured command name). For API keys, use
`DISPOSABL_API_KEY`. Login stores a private local refresh token; API calls refresh
the session and send the access token. `logout` removes the local session.

Operations accept field flags or `--data` with the flat JSON body; `--data -` reads
stdin. Use subcommand help for the current input contract. `whoami` aliases the
account GET operation. `dashboard` prints platform links; `dashboard --open`
opens the configured origin.

## Freshness

Published invocations delegate through `npm exec --yes --prefer-online` to this
package's `@latest` release, preserving arguments and the resulting exit status.
Use local development mode or `DISPOSABL_NO_UPDATE=1` to test unpublished code.
The delegated process has a recursion guard. Delegation failure fails the command.
`DISPOSABL_NO_UPDATE=1` uses the installed release; `DISPOSABL_CLI_DEV=1` skips both
delegation and skill refresh.

When `skills.source` is configured, CLI startup runs the pinned `skills` installer
to refresh only the named skill globally for Codex and Claude Code. The skill
source updates independently of npm package versions. Use a repository containing
only this product's skill. Refresh failures warn and continue;
`DISPOSABL_SKIP_SKILLS=1` skips refresh. `skills` also prints the configured source
and skill name. A running agent may need a new session or plugin reload to use
updated instructions.

## Build and release

Run `bun run platforms:generate`, then `bun run --cwd packages/cli build` from the
repository root. The Node executable bundles its runtime dependencies and requires
Node 22.20 or later. Preview package contents with
`npm pack --dry-run --ignore-scripts` in this directory.

Use `bun run changeset` for CLI changes. CLI and SDK versions are independent;
publishing uses the opt-in [shared release workflow](../../.changeset/README.md).
