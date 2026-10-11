import {
  createRootRouteWithContext,
  Link,
  Outlet,
} from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { DeploymentUpdateNotice } from "../components/deployment-update-notice";
import { RouteErrorBoundary } from "../providers/error-boundary";
import { loadApiReference } from "../lib/api-reference";
import { Button } from "../components/ui/button";

export type KitRouterContext = {
  name: string;
  afterSignIn?: string;
  deploymentQuery?: ComponentProps<typeof DeploymentUpdateNotice>["query"];
  apiReference?: Parameters<typeof loadApiReference>[0] & { title?: string };
};

export const Route = createRootRouteWithContext<KitRouterContext>()({
  component: RootLayout,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <main className="grid min-h-svh place-content-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">This page doesn't exist.</p>
      <Button asChild>
        <Link to="/">Go home</Link>
      </Button>
    </main>
  );
}

function RootLayout() {
  const { deploymentQuery } = Route.useRouteContext();
  return (
    <div className="min-h-svh bg-background text-foreground">
      <Outlet />
      {deploymentQuery ? (
        <DeploymentUpdateNotice query={deploymentQuery} />
      ) : null}
    </div>
  );
}
