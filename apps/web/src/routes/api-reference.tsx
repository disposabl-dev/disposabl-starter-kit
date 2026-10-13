import { createFileRoute } from "@tanstack/react-router";
import { ApiReference } from "disposabl-kit/components/api-reference";

const content = JSON.stringify({
  openapi: "3.1.0",
  info: {
    title: "Starter Kit API",
    version: "0.0.0",
    description:
      "No public API endpoints are configured yet. Replace this starter document with your application's OpenAPI specification.",
  },
  paths: {},
});

export const Route = createFileRoute("/api-reference")({
  component: ApiReferenceRoute,
});

function ApiReferenceRoute() {
  return <ApiReference content={content} />;
}
