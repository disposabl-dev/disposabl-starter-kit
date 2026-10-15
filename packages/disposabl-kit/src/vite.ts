import { relative } from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { physical, rootRoute } from "@tanstack/virtual-file-routes";
import type { Plugin } from "vite";

export function watchKitRoutes(): Plugin {
  return {
    name: "disposabl-kit:watch-routes",
    configureServer(server) {
      server.watcher.add(fileURLToPath(new URL("./routes/", import.meta.url)));
    },
  };
}

export function kitRoutes(appRoutes: URL) {
  const sharedRoutes = new URL("./routes/", import.meta.url);

  return rootRoute("__root.tsx", [
    physical("."),
    physical(relative(fileURLToPath(appRoutes), fileURLToPath(sharedRoutes))),
  ]);
}

/** Serve generated documentation only when the app explicitly enables its API. */
export function openApiReference(spec: URL, enabled: boolean): Plugin {
  return {
    name: "disposabl-kit:openapi",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url?.split("?")[0] !== "/api-reference/openapi.yaml")
          return next();
        if (!enabled) {
          response.writeHead(404).end();
          return;
        }
        try {
          const content = await readFile(spec, "utf8");
          response.setHeader("Content-Type", "application/yaml; charset=utf-8");
          response.setHeader("Cache-Control", "no-store");
          response.end(content);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") return next();
          next(error as Error);
        }
      });
    },
    async generateBundle() {
      if (enabled)
        this.emitFile({
          type: "asset",
          fileName: "api-reference/openapi.yaml",
          source: await readFile(spec, "utf8"),
        });
    },
  };
}
