import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "disposabl-kit",
    environment: "happy-dom",
    include: ["tests/**/*.test.tsx"],
  },
});
