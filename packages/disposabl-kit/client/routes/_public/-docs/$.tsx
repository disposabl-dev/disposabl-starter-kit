import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { Suspense } from "react";
import collections from "../../../.source/browser";
import { useMDXComponents } from "../../../components/mdx";
import { source } from "../../../lib/source";
import { i18n } from "../../../lib/i18n";
import fumadocsCss from "../../../styles/fumadocs.css?url";

export const Route = createFileRoute("/{-$lang}/docs/$")({
  component: Page,
  beforeLoad: ({ params }) => {
    if (params.lang && !i18n.languages.includes(params.lang)) throw notFound();
    if (params.lang === i18n.defaultLanguage)
      throw redirect({
        to: "/{-$lang}/docs/$",
        params: { lang: undefined, _splat: params._splat },
        replace: true,
      });
  },
  loader: async ({ params }) => {
    const slugs = params._splat?.split("/").filter(Boolean) ?? [];
    const data = await serverLoader({
      data: { slugs, lang: params.lang ?? i18n.defaultLanguage },
    });
    await clientLoader.preload(data.path);
    return data;
  },
  head: () => ({ links: [{ rel: "stylesheet", href: fumadocsCss }] }),
});

const serverLoader = createServerFn({ method: "GET" })
  .validator((data: { slugs: string[]; lang: string }) => {
    if (!i18n.languages.includes(data.lang)) throw notFound();
    return data;
  })
  .handler(async ({ data: { slugs, lang } }) => {
    const page = source.getPage(slugs, lang);
    if (!page) throw notFound();

    return {
      path: page.path,
      pageTree: await source.serializePageTree(source.getPageTree(lang)),
    };
  });

const clientLoader = collections.docs.createClientLoader({
  component: function Content({ toc, frontmatter, default: MDX }) {
    return (
      <DocsPage toc={toc}>
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{frontmatter.description}</DocsDescription>
        <DocsBody>
          <MDX components={useMDXComponents()} />
        </DocsBody>
      </DocsPage>
    );
  },
});

function Page() {
  const data = useFumadocsLoader(Route.useLoaderData());

  return (
    <DocsLayout nav={{ title: "" }} tree={data.pageTree}>
      <Suspense>{clientLoader.useContent(data.path)}</Suspense>
    </DocsLayout>
  );
}
