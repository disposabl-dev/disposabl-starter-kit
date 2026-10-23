import { createOpenAPI } from "fumadocs-openapi/server";
import type { Document } from "fumadocs-openapi";
import { loader } from "fumadocs-core/source";
import { i18n } from "./i18n.ts";
import spec from "../../../../generated/openapi.json" with { type: "json" };

// The accepted contract is bundled at build time, without fetching a deployment.
export const openapi = createOpenAPI({
  input: {
    api: {
      ...spec,
      servers: [
        {
          url:
            import.meta.env?.VITE_CONVEX_SITE_URL ??
            import.meta.env?.VITE_CONVEX_URL?.replace(
              /\.convex\.cloud\/?$/,
              ".convex.site",
            ) ??
            "/",
        },
      ],
    } as Document,
  },
});

export const apiSource = loader({
  i18n,
  baseUrl: "/docs/api",
  source: await openapi.staticSource({ groupBy: "tag", meta: true }),
  plugins: [openapi.loaderPlugin()],
});
