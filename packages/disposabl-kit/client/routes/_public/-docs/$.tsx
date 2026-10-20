import { createFileRoute, notFound } from "@tanstack/react-router";
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
import { Logo } from "../../../components/logo";

export const Route = createFileRoute("/{-$lang}/docs/$")({
  component: Page,
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
  /** Render a Markdown module with its page metadata and shared MDX components. */
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

/** Render the requested locale's navigation tree and lazy-loaded Markdown content. */
function Page() {
  const data = useFumadocsLoader(Route.useLoaderData());
  const { lang } = Route.useParams();

  return (
    <DocsLayout
      nav={{ title: <Logo />, url: lang ? `/${lang}` : "/" }}
      tree={data.pageTree}
    >
      <Suspense>{clientLoader.useContent(data.path)}</Suspense>
    </DocsLayout>
  );
}
