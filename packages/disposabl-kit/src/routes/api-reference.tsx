import { createFileRoute, notFound } from "@tanstack/react-router";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";
import { T } from "gt-react";

export const Route = createFileRoute("/api-reference")({
  loader: async () => {
    const response = await fetch("/openapi.json");
    if (!response.ok) throw notFound();
    const spec = await response.json().catch(() => null);
    if (!spec?.openapi || !spec?.info || !spec?.paths) {
      throw notFound();
    }

    return JSON.stringify(spec);
  },
  component: ApiReferenceRoute,
  notFoundComponent: () => (
    <p>
      <T>API reference is unavailable.</T>
    </p>
  ),
});

function ApiReferenceRoute() {
  const content = Route.useLoaderData();
  return <ApiReferenceReact configuration={{ content }} />;
}
