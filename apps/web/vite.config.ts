import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import gtConfig from "./gt.config.json" with { type: "json" };
import { createKitConfig } from "@disposabl/disposabl-kit/client/vite.config";

export default defineConfig(() => {
  const appRoutes = new URL("./src/routes/", import.meta.url);
  const kit = createKitConfig(appRoutes);
  const envDir = fileURLToPath(
    new URL("../../packages/backend/", import.meta.url),
  );
  return {
    envDir,
    resolve: {
      alias: {
        "#app": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    build: {
      rolldownOptions: { output: { strictExecutionOrder: true } },
    },
    plugins: [
      kit.plugins,
      nitro({
        rollupConfig: { external: [/^@sentry\//] },
        rolldownConfig: {
          onwarn(warning, warn) {
            // Dependency RSC markers are unused by this regular SSR build.
            if (
              warning.code === "MODULE_LEVEL_DIRECTIVE" &&
              warning.message.includes('"use client"') &&
              warning.message.includes("node_modules/")
            )
              return;
            warn(warning);
          },
        },
      }),
      tanstackStart({
        router: kit.router,
        pages: kit.pages,
        prerender: {
          ...kit.prerender,
          headers: { "Accept-Language": gtConfig.defaultLocale },
        },
      }),
      react(),
      tailwindcss(),
    ],
  };
});
