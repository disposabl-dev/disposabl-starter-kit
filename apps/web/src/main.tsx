import { createRoot } from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { ConvexReactClient } from "convex/react";
import {
  Providers,
  ErrorRecovery,
  RouteErrorBoundary,
} from "disposabl-kit/providers";
import { api } from "disposabl-backend/api";
import { routeTree } from "./routeTree.gen";
import "./index.css";

const router = createRouter({
  routeTree,
  context: {
    name: "Disposabl",
    deploymentQuery: api.staticHosting.getCurrentDeployment,
    apiReference: {
      siteUrl: import.meta.env.VITE_CONVEX_SITE_URL,
      convexUrl: import.meta.env.VITE_CONVEX_URL,
    },
  },
  defaultErrorComponent: RouteErrorBoundary,
  disableGlobalCatchBoundary: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const root = createRoot(document.getElementById("root")!);
let convex: ConvexReactClient | undefined;
try {
  convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);
} catch (error) {
  root.render(
    <ErrorRecovery error={error} showDetails={import.meta.env.DEV} />,
  );
}
if (convex) {
  root.render(
    <Providers
      auth={{
        client: convex,
        clientId: import.meta.env.VITE_WORKOS_CLIENT_ID,
        redirectUri: import.meta.env.VITE_WORKOS_REDIRECT_URI,
      }}
      showErrorDetails={import.meta.env.DEV}
    >
      <RouterProvider router={router} />
    </Providers>,
  );
}
import.meta.hot?.dispose(() => {
  root.unmount();
  void convex?.close();
});
