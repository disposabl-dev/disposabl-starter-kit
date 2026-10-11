import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

export default defineConfig({
  envDir: "../..",
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      virtualRouteConfig: {
        type: "root",
        file: "__root.tsx",
        children: [
          {
            type: "physical",
            directory: "../../../../packages/disposabl-kit/src/routes",
            pathPrefix: "",
          },
          { type: "physical", directory: ".", pathPrefix: "" },
        ],
      },
    }),
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
});
