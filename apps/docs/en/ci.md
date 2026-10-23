---
title: Continuous integration
description: Check project changes before merging them.
---

The repository includes a GitHub Actions validation workflow.

## Current checks

On pushes, pull requests, and manual runs, the workflow installs Bun, installs dependencies with a frozen lockfile, and runs:

```sh
bun run validate:check
```

This checks lint, formatting, and types.

## Local checks

Run the same command from the repository root before handing off a change. Use `bun run validate` only when you intend to apply automatic fixes.

## What still needs checking

The workflow does not build or exercise every client. Browser behavior, provider integrations, native builds, and device verification need their own checks.

Start with [web and mobile](/docs/platforms) when planning those checks.
