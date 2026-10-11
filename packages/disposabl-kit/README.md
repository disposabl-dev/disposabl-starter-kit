# Disposabl kit

Shared shadcn components, hooks, and Tailwind styles. Apps bundle the TypeScript source directly.

```tsx
import "disposabl-kit/styles.css";
import { Button } from "disposabl-kit/components/ui/button";
```

Consumer Vite apps use `@tailwindcss/vite`. Add primitives with the shadcn CLI from this package directory using `components.json`.

Run `bun run lint`, `bun run typecheck`, and `bun run format` here or from the repository root.
