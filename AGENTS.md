# Development

- Use Bun and TypeScript. Shared dependency versions live in the root catalog.
- Keep app pages and application logic in `apps/web`; common routes, auth, components, and styles in `packages/disposabl-kit`.
- Keep Convex functions in `packages/backend/convex`.
- Use package exports and shared ESLint/TypeScript configs.
- Run `bun run format`, then `bun run lint`, `bun run typecheck`, `bun run test`, and `bun run build`.
- Verify UI changes in the browser.
- Before changing Turbo configuration, read the relevant docs in `node_modules/turbo/docs`.
