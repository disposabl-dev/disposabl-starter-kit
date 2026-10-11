# Development

- Use Bun and TypeScript. Shared dependency versions live in the root catalog.
- Keep routes and application logic in `apps/web`; shared components and styles in `packages/disposabl-kit`.
- Use package exports and shared ESLint/TypeScript configs.
- Run `bun run format`, then `bun run lint`, `bun run typecheck`, and `bun run build`.
- Verify UI changes in the browser.
- Before changing Turbo configuration, read the relevant docs in `node_modules/turbo/docs`.
