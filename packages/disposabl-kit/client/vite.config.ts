import { createFilter, type PluginOption } from "vite";
import { fumadocsMdx } from "fumadocs-mdx/vite";
import { fileURLToPath } from "node:url";
import { relative } from "node:path";
import {
  layout,
  physical,
  rootRoute,
  route,
} from "@tanstack/virtual-file-routes";
import { i18n } from "./lib/i18n.ts";

const docs = true;
const docsSearch = "/docs-search";
const authRoutes = [
  "callback",
  "login",
  "sign-in",
  "signin",
  "sign-up",
  "signup",
];
const localePrefix = `{,/{${i18n.languages.join(",")}}}`;
const clientOnlyPaths = [
  `${localePrefix}/dashboard{,/**}`,
  `/{${authRoutes.join(",")}}`,
];
/** Resolve a kit-relative path independently of the consuming app's directory. */
const clientPath = (path: string) =>
  fileURLToPath(new URL(path, import.meta.url));

/** Build shared routes, optional docs plugins, and public prerender settings for an app. */
export function createKitConfig(appRoutes: URL) {
  const shared = relative(fileURLToPath(appRoutes), clientPath("./routes/"));
  const canPrerender = createFilter(undefined, clientOnlyPaths, {
    resolve: false,
  });
  const plugins: PluginOption[] = [
    docs &&
      fumadocsMdx({
        configPath: clientPath("./source.config.ts"),
        outDir: clientPath("./.source/"),
        macro: false,
      }),
    {
      name: "disposabl-kit",
      config: () => ({ define: { __DOCS_ENABLED__: docs } }),
      configureServer(server) {
        const content = clientPath("../../../apps/docs/");
        server.watcher.add([
          clientPath("./routes/"),
          ...(docs ? [content] : []),
        ]);
        server.watcher.on("all", (event, file) => {
          if (
            (event === "add" || event === "unlink") &&
            file.startsWith(content)
          )
            void server.restart();
        });
      },
    },
  ];
  return {
    plugins,
    router: {
      // Root and auth routes are mounted outside the localized subtree.
      routeFileIgnorePattern: "^(__root\\.tsx|_auth-pages)$",
      virtualRouteConfig: rootRoute(`${shared}/__root.tsx`, [
        layout(
          "_auth-pages",
          `${shared}/_auth-pages/route.tsx`,
          authRoutes.map((path) =>
            route(`/${path}`, `${shared}/_auth-pages/${path}.tsx`),
          ),
        ),
        route("/{-$lang}", [
          physical("."),
          physical(shared),
          ...(docs ? [route("/docs/$", `${shared}/_public/-docs/$.tsx`)] : []),
        ]),
        ...(docs
          ? [route(docsSearch, `${shared}/_public/-docs-search.ts`)]
          : []),
      ]),
    },
    pages: docs
      ? [
          ...i18n.languages.map((lang) => ({
            path: lang === i18n.defaultLanguage ? "/docs" : `/${lang}/docs`,
          })),
          {
            path: docsSearch,
            prerender: { enabled: true, outputPath: docsSearch },
          },
        ]
      : [],
    prerender: {
      enabled: true,
      filter: ({ path }: { path: string }) =>
        canPrerender(path.replace(/\/$/, "") || "/"),
    },
  };
}
