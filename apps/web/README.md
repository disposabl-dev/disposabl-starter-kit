# Web

React + Vite, React Compiler, and TanStack file routing. Run `bun run dev` from the repository root.

`src/routes/__root.tsx` uses the kit's root route. The Vite router plugin discovers app routes and the kit's default public routes automatically. `src/routeTree.gen.ts` is generated and committed; do not edit it.

Add `src/routes/__public/hello.tsx` for `/hello`. Add `src/routes/__authenticated/dashboard/world.tsx` for protected `/dashboard/world`. Use `createFileRoute` and export `Route` as in the existing files. Start the dev server to regenerate routes while editing. No registration list is needed.

`src/routes/__authenticated/route.tsx` applies authentication and the dashboard layout to every route in that folder. The dashboard starts in `__authenticated/dashboard/index.tsx`.

`src/components/sidebar.tsx` contains business navigation. The kit supplies organization and user controls, auth, and shared layouts.

Add shadcn components with `bun run shadcn add <component>`. Shared primitives belong in `disposabl-kit`.
