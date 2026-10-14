import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { kitRoutes, watchKitRoutes } from "disposabl-kit/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  envDir: fileURLToPath(new URL("../../packages/backend/", import.meta.url)),
  plugins: [
    watchKitRoutes(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      virtualRouteConfig: kitRoutes(new URL("./src/routes/", import.meta.url)),
    }),
    tailwindcss(),
  ],
});
