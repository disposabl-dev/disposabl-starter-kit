import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "backend",
    environment: "edge-runtime",
    include: ["tests/**/*.test.ts"],
    server: {
      deps: {
        inline: [
          "@convex-dev/workos-authkit",
          "@convex-dev/workflow",
          "@convex-dev/workpool",
        ],
      },
    },
  },
});
