import { createRouter, ErrorComponent } from "@tanstack/react-router";
import { initializeGT } from "gt-tanstack-start";
import gtConfig from "../gt.config.json";
import { routeTree } from "./routeTree.gen";

initializeGT({
  ...gtConfig,
  // Vite needs a relative pattern to discover these generated translations.
  loadTranslations: async (locale) =>
    (await import(`./_gt/${locale}.json`)).default,
  cacheUrl: null,
  runtimeUrl: null,
});

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: ErrorComponent,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
