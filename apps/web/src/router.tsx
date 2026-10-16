import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createRouter,
  ErrorComponent,
  RouterProvider,
} from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "./index.css";
import { initializeGTSPA } from "gt-react";
import gtConfig from "../gt.config.json";

await initializeGTSPA({
  ...gtConfig,
  loadTranslations: async (locale) =>
    (await import(`./_gt/${locale}.json`)).default,
  cacheUrl: null,
  runtimeUrl: null,
});

const router = createRouter({
  routeTree,
  defaultErrorComponent: ErrorComponent,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
