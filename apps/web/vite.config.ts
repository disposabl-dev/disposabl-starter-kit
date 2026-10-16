import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { kitRoutes, watchKitRoutes } from "disposabl-kit/vite";
import { fileURLToPath } from "node:url";

export default defineConfig(() => {
  const envDir = fileURLToPath(
    new URL("../../packages/backend/", import.meta.url),
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
