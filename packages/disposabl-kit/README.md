# Disposabl kit

Shared default routes, authentication providers, dashboard layouts, shadcn components, and Tailwind styles. Apps bundle the TypeScript source directly.

`src/routes/__public` owns the public layout, sign-in, sign-up, callback, and API reference. TanStack's Vite plugin merges these defaults with each app's route files. App `routes/__root.tsx` re-exports the shared root route; configure the app name, deployment query, and API reference in the router's `context`.

The dashboard layout keeps organization and user controls in the kit. Apps supply business navigation and content.

The provider stack lives in `src/providers/index.ts`. Add shared primitives here with `bun run shadcn add <component>`.

Run `bun run format`, `bun run lint`, `bun run typecheck`, and `bun run test` here or from the root.
