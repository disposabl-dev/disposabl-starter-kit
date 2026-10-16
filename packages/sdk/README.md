# TypeScript SDK

This app owns the package name, version, description, and custom code in
`packages/sdk`. Change these for each app created from the starter kit.

Hey API regenerates only `generated/typescript/`. Add custom helpers in
`packages/sdk/` and export them from `index.ts`. Regeneration preserves
these files. Both generated functions and custom helpers ship in the same package.

```ts
import { createClient, accountInternalGetAccount } from "@disposabl/sdk";

const client = createClient({
  baseUrl: "https://YOUR-DEPLOYMENT.convex.site",
  auth: process.env.API_KEY, // Bare key; the client adds "Bearer ".
});
const { data, error } = await accountInternalGetAccount({ client });
```

Use a server-side API key. Do not bundle a secret key into a public browser app.
The SDK uses native fetch. Set its API origin and bearer credential when creating
the client; it does not read the CLI's defaults in root `platforms.config.ts`.
Those CLI defaults currently point to a development deployment; each app must
choose its own production origin and package identities before release.

## Build

From the repository root, run `bun run sdk:build`. This checks the API contract,
regenerates the SDK, and bundles the package with TypeScript declarations.
Commit `generated/openapi.json`, `generated/typescript/`, and
`packages/backend/convex/apiFunctions.ts` with API changes. CI regenerates the
contract locally and rejects stale generated artifacts without needing a deployed
API or API key. Breaking contract changes require an intentional
`--once --accept-breaking` generator run and a release changeset.

Preview the npm contents with `npm pack --dry-run --ignore-scripts` inside
`packages/sdk`. Custom runtime dependencies belong in this package's
`dependencies`.

## Releases

The SDK and CLI have independent Changesets 3 versions. Run `bun run changeset`
for a package change, select the affected packages, and choose each version bump.
Review custom helpers for breaking changes too; the OpenAPI compatibility check
covers the generated contract.

Publishing is disabled until `PACKAGE_RELEASE_ENABLED` is `true`. Configure npm
package identities, initial publications, and trusted publishers for
`.github/workflows/release.yml` before enabling it. The workflow checks and builds
pull requests; after opt-in on `main`, it creates a version PR or packs and
publishes released versions using GitHub OIDC. See
[release setup](../../.changeset/README.md).
