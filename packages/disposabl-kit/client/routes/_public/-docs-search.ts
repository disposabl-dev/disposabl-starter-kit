import { createFileRoute } from "@tanstack/react-router";
import { createFromSource } from "fumadocs-core/search/server";
import { searchSource } from "../../lib/source";

const server = createFromSource(searchSource);

export const Route = createFileRoute("/docs-search")({
  server: {
    handlers: {
      GET: () => server.staticGET(),
    },
  },
});
