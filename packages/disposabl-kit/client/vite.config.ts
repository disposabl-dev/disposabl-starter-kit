import type { Plugin } from "vite";
import { fileURLToPath } from "node:url";
import { relative } from "node:path";
import { physical, rootRoute } from "@tanstack/virtual-file-routes";

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

  return {
    virtualRouteConfig: rootRoute("__root.tsx", [
      physical("."),
      physical(relative(fileURLToPath(appRoutes), fileURLToPath(sharedRoutes))),
    ]),
  };
}
