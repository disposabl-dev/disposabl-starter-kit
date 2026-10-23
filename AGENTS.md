# Project instructions

Use Bun. Run shared commands from the repository root.

## Stack

React and TanStack Start for web. Expo and React Native for mobile.
Convex for backend. Tailwind CSS and shadcn/ui for UI. WorkOS AuthKit for auth.
Fumadocs for content. PostHog for analytics. General Translation for translations.
App integrations are being migrated.

## Commands

```sh
bun install
bun run dev             # Run apps (not configured yet)
bun run build           # Build apps (not configured yet)
bun run test            # Run tests (not configured yet)
bun run validate        # Auto-fix lint, format, and check types
bun run validate:check  # Read-only validation
bun run lint            # Lint
bun run fmt             # Format
bun run check           # TypeScript checks across workspaces
```

## Conventions

- App code in `apps/`; shared code in `packages/`.
- Blog, changelog, and docs contain Markdown only.
- Shared dependency versions belong in root catalogs.
- Use package exports for cross-package imports and shared components. Relative imports are fine within the same package; leave generated imports alone.
- Use Radix UI for UI primitives. Compose the combobox from the shared Popover and Command components.
- Keep changes scoped. Run `bun run validate:check` before handing off.

## Breaking platform changes

- If generation emits `PLATFORM_BREAKING_CHANGE_APPROVAL_REQUIRED`, stop and show the reported API/MCP changes to the user. Generated files must stay unchanged.
- Run `bun run generate:platforms --accept-breaking` only after the user explicitly approves those specific changes. A general request to implement or generate platforms is not approval to accept a breaking change. Do not edit or delete generated contracts to bypass this check.
