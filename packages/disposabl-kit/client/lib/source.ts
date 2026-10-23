import { loader } from "fumadocs-core/source";
import { docs } from "../.source/server";
import { i18n } from "./i18n";
import { openapi } from "./openapi";
export { apiSource } from "./openapi";

export const source = loader({
  i18n,
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
});

export const searchSource = loader({
  i18n,
  baseUrl: "/docs",
  source: {
    docs: docs.toFumadocsSource(),
    openapi: await openapi.staticSource({ baseDir: "api", groupBy: "tag" }),
  },
});
