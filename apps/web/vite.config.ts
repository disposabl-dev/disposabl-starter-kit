import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import gtConfig from "./gt.config.json" with { type: "json" };
// import { kitRoutes, watchKitRoutes, kitContent } from "disposabl-kit/vite";
// import siteConfig from "./site.config.ts";
// import kitConfig from "./kit.config.ts";

export default defineConfig(() => {
  const envDir = fileURLToPath(
    new URL("../../packages/backend/", import.meta.url),
  );
  return {
    envDir,
    build: {
      rolldownOptions: { output: { strictExecutionOrder: true } },
    },
    plugins: [
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
        prerender: {
          enabled: true,
          headers: { "Accept-Language": gtConfig.defaultLocale },
        },
      }),
      react(),
      tailwindcss(),
    ],
  };
});
