---
title: Agent plugins
description: Share skills and your MCP connection with Codex and Claude Code.
---

Edit `packages/plugins/plugin.json` for the plugin's name, version, and description. Keep shared workflows in `packages/plugins/skills/<name>/SKILL.md`. Both hosts receive the same skills and version. Bump the plugin version when releasing skill changes; Git records their history.

## Generate

Run from the repository root with your Convex site URL:

```sh
DISPOSABL_PLATFORMS=openai-plugin,claude-plugin \
CONVEX_SITE_URL=https://your-deployment.convex.site \
bun run generate:platforms --no-deploy
```

This generates `generated/plugins/codex/`, `generated/plugins/claude-code/`, and local marketplace catalogs. Enable either flag independently. Both imply MCP support; API support is independent. Generated files are ignored by Git, and regeneration preserves authored skills.

Use the same environment with `bun run generate:platforms --check` to check for drift without writing or deploying. The existing API/MCP compatibility gate still applies. The default command retains its Convex deployment step.

## Install

For Codex:

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

If you rename the plugin, substitute its configured name and `<name>-plugins` marketplace. Open a new host session, complete MCP sign-in, and invoke the setup skill. A successful account response verifies access; installation alone does not.

For a release, distribute the generated host folder from the approved commit. Public directory submission has separate publisher-metadata and review requirements. Installed plugins still call the live `/mcp` server, so preserve compatibility for released skills.
