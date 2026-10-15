import { createFileRoute, notFound } from "@tanstack/react-router";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";
import { T } from "gt-react";

export const Route = createFileRoute("/api-reference")({
  loader: async () => {
    const response = await fetch("/openapi.yaml");
    if (!response.ok) throw notFound();
    const content = await response.text();
    if (!/^openapi:/m.test(content)) throw notFound();
    return content;
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
