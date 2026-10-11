# Disposabl starter kit

Bun + Turborepo, React + Vite, React Compiler, and TanStack Router.

- `apps/web` contains the web app.
- `packages/disposabl-kit` contains default public routes and auth providers, shared shadcn components, and Tailwind styles.
- `packages/backend` contains Convex functions and components.
- `packages/eslint-config` and `packages/typescript-config` provide shared tooling.

```sh
bun install
bun run dev
```

Run `bun run format` to format files. Run `bun run lint`, `bun run typecheck`, `bun run test`, and `bun run build` to check the workspace. Shared dependency versions live in the root `package.json` catalog.

Run `bun run dev` to start Vite and Convex. The first Convex run configures a development deployment. Backend typechecks and tests run locally; deploy explicitly with `bun run --cwd packages/backend deploy`.

Web apps use TanStack file routing in `src/routes`. The Vite plugin automatically includes the kit's public routes alongside app routes. The shared provider stack handles AuthKit, Convex, theme, tooltips, and error recovery. Put `VITE_CONVEX_URL`, `VITE_WORKOS_CLIENT_ID`, and `VITE_WORKOS_REDIRECT_URI` in the root `.env.local`. The WorkOS redirect URI should point to `/callback`.
