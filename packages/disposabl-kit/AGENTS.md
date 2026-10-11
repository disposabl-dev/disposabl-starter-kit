# Disposabl kit

- Keep primitives in `src/components/ui`, shared components in `src/components`, and styles in `src/styles`.
- Keep default public routes in `src/routes`. Apps use normal TanStack file routing; the Vite plugin mounts shared defaults with app routes. Keep app-specific settings in the router context.
- Keep the shared provider stack in `src/providers/index.ts` and provider implementations in `src/providers`.
- Keep application routes, business logic, and secrets in their owning app or backend.
- Keep package exports and `components.json` aliases aligned with the source files.
