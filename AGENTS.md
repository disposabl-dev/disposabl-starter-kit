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
- Use Radix UI for UI primitives. Compose the combobox from the shared Popover and Command components.
- Keep changes scoped. Run `bun run validate:check` before handing off.
