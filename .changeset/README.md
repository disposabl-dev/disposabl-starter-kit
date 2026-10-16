# Package releases

Changesets 3 manages `@disposabl/cli` and `@disposabl/sdk` independently. Their
versions are neither fixed nor linked; `disposabl-kit` is ignored and private
packages are not versioned or tagged.

Run `bun run changeset` for a publishable change. Select every affected package,
choose its patch, minor, or major bump, and commit the resulting changeset with
the code. API changes can affect both packages; custom SDK helpers can affect only
the SDK. Commit regenerated API artifacts too.

## Enable publishing

1. Choose the app's npm package names, command name, and repository. Configure
   root `platforms.config.ts` with the public API origin, WorkOS client ID, and
   separate skill source. Update plugin and skill identities for the app.
2. Complete initial npm publications and configure trusted publishers for both
   packages using this repository's `.github/workflows/release.yml`.
3. Set the GitHub repository variable `PACKAGE_RELEASE_ENABLED` to `true` only
   when both package publishers are ready.

The CLI's `1.0.0` release intentionally replaces the existing `@disposabl/cli`
package on `latest`, from repository `disposabl-dev/disposabl-starter-kit`. Root
`platforms.config.ts` still points to a verified development deployment; publishing
does not promote that deployment to production. The skill source is unconfigured.

Setup does not publish anything. The workflow runs checks and builds on pull
requests, pushes to `main`, and manual dispatch. It regenerates API artifacts and
requires them to match committed files. Release planning is enabled only on
`main` with the opt-in variable set.

Changesets then opens or updates a version PR, using `bun run release:version`
to update package versions and the Bun lockfile. After the version PR merges,
the workflow packs and publishes the pending releases with GitHub OIDC. The
publish job alone receives `id-token: write`; the version job receives repository
and pull-request write permissions. No npm token is configured by this workflow.

Skill content is released through its configured Git source, separately from npm.
Changes to that content do not require a CLI or SDK version unless their code or
bundled configuration also changes.
