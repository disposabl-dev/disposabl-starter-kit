import { createRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { loadApiReference } from "../../lib/api-reference";
import { Route as rootRoute } from "../__root";

const ApiReference = lazy(() =>
  import("../../components/api-reference").then((module) => ({
    default: module.ApiReference,
  })),
);

import { Route as publicRoute } from "./route";

export const Route = createRoute({
  getParentRoute: () => publicRoute,
  path: "api-reference",
  loader: ({ context }) => loadApiReference(context.apiReference),
  component: ApiReferencePage,
});

function ApiReferencePage() {
  const content = Route.useLoaderData();
  const { name, apiReference } = rootRoute.useRouteContext();
  return (
    <Suspense
      fallback={
        <main className="p-6" role="status">
          Loading API reference
        </main>
      }
    >
      <ApiReference
        content={content}
        title={apiReference?.title ?? `${name} API Reference`}
      />
    </Suspense>
  );
}
