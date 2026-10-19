import { createFileRoute } from "@tanstack/react-router";
import { createFromSource } from "fumadocs-core/search/server";
import { source } from "../../lib/source";

const server = createFromSource(source);

export const Route = createFileRoute("/docs-search")({
  server: {
    handlers: {
      GET: () => server.staticGET(),
    },
  },
});
