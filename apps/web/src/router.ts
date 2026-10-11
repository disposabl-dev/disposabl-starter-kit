import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import App from "./App";

const rootRoute = createRootRoute();
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: App,
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([indexRoute]),
});

// Register the router for typed links and navigation.
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
