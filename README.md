# Disposabl starter kit

Bun workspaces managed with Turborepo.

```text
apps/
  web/
  docs/
packages/
  disposabl-kit/
  disposabl-platforms/
  backend/
```

Run `bun install` to install dependencies. Root commands `bun run dev`,
`bun run build`, and `bun run lint` run matching workspace scripts once those
scripts are added. Workspaces currently contain only package metadata.

Empty `.env` files are available at the root and in each workspace. Local
environment files are ignored by Git; `.env.example` files are tracked.
Turborepo includes root environment files and workspace build environment files
in its cache hashes. It does not load them; workspace runtimes must load their
own environment files.

`disposabl-platforms` is configured for public npm publishing with version
`0.0.0`. Its `files` list includes only `dist`, plus npm's mandatory metadata.
Add the implementation, build output, and package exports before publishing.
All other workspaces are private.
