import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import {
  kitRoutes,
  watchKitRoutes,
  openApiReference,
} from "disposabl-kit/vite";
import { parsePlatforms } from "../../packages/backend/platforms.ts";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  const envDir = fileURLToPath(
    new URL("../../packages/backend/", import.meta.url),
  );
  const platforms = parsePlatforms(
    loadEnv(mode, envDir, "DISPOSABL_").DISPOSABL_PLATFORMS,
  );
  return {
    envDir,
    build: {
      rolldownOptions: {
        output: {
          strictExecutionOrder: true,
          codeSplitting: {
            groups: [
              {
                name: "scalar",
                test: /node_modules\/@scalar\//,
                entriesAware: true,
                maxSize: 500_000,
              },
            ],
          },
        },
      },
    },
    plugins: [
      openApiReference(
        new URL("../../packages/backend/openapi.yaml", import.meta.url),
        platforms.has("api"),
      ),
      watchKitRoutes(),
      tanstackRouter({
        target: "react",
        autoCodeSplitting: true,
        virtualRouteConfig: kitRoutes(
          new URL("./src/routes/", import.meta.url),
        ),
      }),
      tailwindcss(),
    ],
  };
});
