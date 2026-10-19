import type { ReactNode } from "react";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import {
  getLocale,
  getTranslationsSnapshot,
  GTProvider,
} from "gt-tanstack-start";
import { getLocaleDirection } from "generaltranslation";
import appCss from "../index.css?url";

export const Route = createRootRoute({
  loader: async (): Promise<{
    locale: string;
    translations: Awaited<ReturnType<typeof getTranslationsSnapshot>>;
  }> => {
    const locale = getLocale();
    return { locale, translations: await getTranslationsSnapshot(locale) };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Disposabl" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: Outlet,
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
  const { locale, translations } = Route.useLoaderData();
  return (
    <html lang={locale} dir={getLocaleDirection(locale)}>
      <head>
        <HeadContent />
      </head>
      <body>
        <GTProvider locale={locale} translations={translations}>
          {children}
        </GTProvider>
        <Scripts />
      </body>
    </html>
  );
}
