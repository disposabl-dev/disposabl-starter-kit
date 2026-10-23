import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  PageLastUpdate,
  MarkdownCopyButton,
} from "fumadocs-ui/layouts/docs/page";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { lazy, Suspense } from "react";
import { BookOpen, Braces, FileCode, Terminal } from "lucide-react";
import { useGT } from "gt-react";
import collections from "../../../.source/browser";
import { useMDXComponents } from "../../../components/mdx";
import { source, apiSource } from "../../../lib/source";
import { i18n } from "../../../lib/i18n";
import { Header } from "../../../components/header";

const ApiReference = lazy(() =>
  import("../../../components/api-reference").then(({ ApiReference }) => ({
    default: ApiReference,
  })),
);

export const Route = createFileRoute("/{-$lang}/docs/$")({
  server: {
    handlers: {
      GET: async ({ params, next }) => {
        if (!params._splat?.endsWith(".md")) return next();
        const lang = params.lang ?? i18n.defaultLanguage;
        const slugs = params._splat.slice(0, -3).split("/").filter(Boolean);
        if (slugs.at(-1) === "index") slugs.pop();
        const selectedSource = slugs[0] === "api" ? apiSource : source;
        const page = i18n.languages.includes(lang)
          ? selectedSource.getPage(
              slugs[0] === "api" ? slugs.slice(1) : slugs,
              lang,
            )
          : undefined;
        if (!page) return new Response("Not found", { status: 404 });

        return new Response(
          [
            `# ${page.data.title}`,
            page.data.description,
            "getSchema" in page.data
              ? `\`\`\`json\n${JSON.stringify(page.data.getSchema().bundled, null, 2)}\n\`\`\``
              : await page.data.getText("processed"),
          ]
            .filter(Boolean)
            .join("\n\n"),
          { headers: { "Content-Type": "text/markdown; charset=utf-8" } },
        );
      },
    },
  },
  component: Page,
  loader: async ({ params }) => {
    const slugs = params._splat?.split("/").filter(Boolean) ?? [];
    const data = await serverLoader({
      data: { slugs, lang: params.lang ?? i18n.defaultLanguage },
    });
    if (data.type === "docs") await clientLoader.preload(data.path);
    return data;
  },
});

const serverLoader = createServerFn({ method: "GET" })
  .validator((data: { slugs: string[]; lang: string }) => {
    if (!i18n.languages.includes(data.lang)) throw notFound();
    return data;
  })
  .handler(async ({ data: { slugs, lang } }) => {
    const selectedSource = slugs[0] === "api" ? apiSource : source;
    if (slugs.length === 1 && slugs[0] === "api") {
      const first = apiSource.getPages(lang)[0];
      if (!first) throw notFound();
      throw redirect({ href: first.url });
    }
    const page = selectedSource.getPage(
      slugs[0] === "api" ? slugs.slice(1) : slugs,
      lang,
    );
    if (!page) throw notFound();

    const shared = {
      path: page.path,
      pageTree: await selectedSource.serializePageTree(
        selectedSource.getPageTree(lang),
      ),
    };
    return "getSchema" in page.data
      ? {
          ...shared,
          type: "openapi" as const,
          title: page.data.title ?? "API reference",
          description: page.data.description,
          toc: page.data.toc.map((item) => ({
            ...item,
            title: String(item.title),
          })),
          api: page.data.getOpenAPIPageProps(),
        }
      : { ...shared, type: "docs" as const };
  });

const clientLoader = collections.docs.createClientLoader({
  /** Render a Markdown module with its page metadata and shared MDX components. */
  component: function Content({
    toc,
    frontmatter,
    lastModified,
    default: MDX,
  }) {
    return (
      <DocsPage toc={toc} className="max-w-[860px] xl:px-10 xl:pt-12">
        <PageHeading title={frontmatter.title} />
        <DocsDescription>{frontmatter.description}</DocsDescription>
        <DocsBody>
          <MDX components={useMDXComponents()} />
        </DocsBody>
        {lastModified && <PageLastUpdate date={lastModified} />}
      </DocsPage>
    );
  },
});

function PageHeading({ title }: { title: string }) {
  const { lang, _splat } = Route.useParams();
  const markdownUrl = `${lang ? `/${lang}` : ""}/docs/${_splat || "index"}.md`;
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <DocsTitle className="min-w-0 flex-1 text-[30px] leading-tight tracking-[-0.035em] sm:text-[34px]">
        {title}
      </DocsTitle>
      <MarkdownCopyButton
        markdownUrl={markdownUrl}
        className="shrink-0 sm:mt-1"
      />
    </div>
  );
}

/** Render the requested locale's navigation tree and lazy-loaded Markdown content. */
function Page() {
  const data = useFumadocsLoader(Route.useLoaderData());
  const { lang } = Route.useParams();
  const gt = useGT();
  const baseUrl = lang ? `/${lang}/docs` : "/docs";
  return (
    <div className="[--fd-banner-height:6.25rem] sm:[--fd-banner-height:3.5rem]">
      <Header authEnabled={!!import.meta.env.VITE_WORKOS_CLIENT_ID} fullWidth />
      <DocsLayout
        key={`${data.type}:${lang ?? i18n.defaultLanguage}`}
        tree={data.pageTree}
        nav={{ title: () => null }}
        sidebar={{
          collapsible: false,
          className:
            "bg-[var(--background)]! [&_a[data-active=true]]:bg-muted/60 [&_a[data-active=true]]:font-medium [&_a[data-active=true]]:text-foreground",
        }}
        tabs={[
          {
            title: gt("Docs"),
            description: gt("Application guides"),
            url: baseUrl,
            icon: <BookOpen className="size-full" />,
          },
          {
            title: gt("OpenAPI reference"),
            description: gt("HTTP API specification"),
            url: `${baseUrl}/api`,
            icon: <FileCode className="size-full" />,
          },
          {
            title: "CLI",
            description: gt("Terminal commands"),
            url: `${baseUrl}/cli`,
            icon: <Terminal className="size-full" />,
          },
          {
            title: "SDK",
            description: gt("TypeScript client"),
            url: `${baseUrl}/sdk`,
            icon: <Braces className="size-full" />,
          },
        ]}
        themeSwitch={{ enabled: false }}
        i18n={false}
        containerProps={{
          className:
            "min-h-[calc(100dvh-var(--fd-banner-height))] [--fd-layout-width:100%]",
        }}
      >
        <Suspense>
          {data.type === "openapi" ? (
            <DocsPage toc={data.toc}>
              <PageHeading title={data.title} />
              <DocsDescription>{data.description}</DocsDescription>
              <DocsBody dir="ltr">
                <ApiReference {...data.api} />
              </DocsBody>
            </DocsPage>
          ) : (
            clientLoader.useContent(data.path)
          )}
        </Suspense>
      </DocsLayout>
    </div>
  );
}
