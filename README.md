# Disposabl starter kit

Bun + Turborepo, React + Vite, React Compiler, and TanStack Router.

- `apps/web` contains the web app.
- `packages/disposabl-kit` contains shared shadcn components and Tailwind styles.
- `packages/eslint-config` and `packages/typescript-config` provide shared tooling.

```sh
bun install
bun run dev
```

Run `bun run format` to format files. Run `bun run lint`, `bun run typecheck`, and `bun run build` to check the workspace. Shared dependency versions live in the root `package.json` catalog.
