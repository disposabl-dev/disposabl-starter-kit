---
title: Agent plugins
description: Package shared skills and your MCP connection for Codex and Claude Code.
---

The plugin generator packages the application's existing `/mcp` endpoint. It does not add another server. `openai-plugin` enables the Codex package, and `claude-plugin` enables the Claude Code package. Both imply MCP support; API support is independent.

## Authoring

Edit `packages/plugins/plugin.json` for the shared name, stable semantic version, description, and publisher metadata. Keep the same version for both hosts. Record each release in `packages/plugins/CHANGELOG.md`.

Keep product workflows under `packages/plugins/skills/<name>/SKILL.md`. Each skill has YAML frontmatter with a matching `name` and a description explaining when to use it. Instructions and supporting resources are copied unchanged into both host packages. The generator validates any space-separated `metadata.required-tools` against the accepted MCP contract. This field is our packaging check, not a host permission setting.

These product skills are separate from repository development skills in `.agents/skills`. Start with `setup`, then add focused workflows such as `account-overview`. Put longer examples in a skill's `references/` directory when needed. Use server tools for live data and authorization.

## Generate locally

Run from the repository root, with the target deployment selected explicitly:

```sh
DISPOSABL_PLATFORMS=openai-plugin,claude-plugin \
CONVEX_SITE_URL=https://your-deployment.convex.site \
bun run generate:platforms --no-deploy
```

This writes `generated/plugins/codex/` and `generated/plugins/claude-code/`, plus host marketplace catalogs under `generated/plugins/`. The generated plugin directory is ignored by Git. Regeneration preserves authored source files and removes generated outputs for disabled hosts.

Use the same environment with `bun run generate:platforms --check` to check for drift without writing or deploying. The existing API/MCP breaking-change approval gate still applies. The default `generate:platforms` command retains its Convex deployment step; `--no-deploy` and `--check` skip deployment.

## Install and verify

Register the generated marketplace and install the Codex plugin:

```sh
codex plugin marketplace add ./generated/plugins
codex plugin add disposabl@disposabl-plugins
```

For Claude Code:

```sh
claude plugin validate ./generated/plugins/claude-code
claude plugin marketplace add ./generated/plugins
claude plugin install disposabl@disposabl-plugins
```

If you rename the plugin, substitute the configured name and `<name>-plugins` marketplace. Open a new host session, complete its MCP sign-in flow, and invoke the setup skill. A successful `disposabl_getAccount` response verifies access. Finding tools or loading a manifest alone does not verify authentication.

Run the requests in `packages/plugins/evals.json` in both hosts against a test account. Check skill selection, tool arguments, pagination, failed sign-in, and unrelated requests. Preserve actual tool results as evidence. Never claim live host verification from the automated fixture tests.

## Release candidates

On a clean committed checkout, with the same target and platform environment:

```sh
bun run plugins:release --output dist/plugins
```

This builds `codex.zip`, `claude-code.zip`, and `release.json` from the accepted local MCP contract. It does not deploy, publish, or contact the endpoint. ZIP packages are self-contained and reproducible. The release record includes the source commit, deployment origin, accepted contract hash, individual skill hashes, and archive hashes.

Use `--allow-dirty` only for local candidate testing; the release record marks those candidates as dirty. Compare against an earlier downloaded release record with `--previous path/to/release.json`. Changed bundle contents require a new version. Existing `plugins-v<version>` Git tags also prevent reusing a version with changed release sources. Keep release tags immutable.

Use patch versions for compatible instruction fixes, minor versions for compatible skill additions, and major versions for incompatible workflow or command changes. Individual skills use the containing plugin's release version; their content hashes identify which skills actually changed.

The Plugin artifacts workflow validates and packages pull requests with a placeholder endpoint and does not upload those bundles. Manual runs and `plugins-v*` tags require the repository variable `PLUGIN_SITE_URL` and upload candidate artifacts with read-only repository permissions. Configure that variable to the intended deployment before running a release candidate build. Publication remains a separate step after both hosts pass verification.

Pin distribution catalogs to the approved release commit or artifact. An installed plugin still calls the live server: preserve MCP tools needed by supported plugin versions, and deploy compatible backend additions before publishing skills that use them. A package rollback does not roll back the MCP server.

Before public directory submission, add the publisher's icon and privacy-policy metadata required by each host. Local installation checks and candidate artifact builds do not establish directory approval.
