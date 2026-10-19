import { StrictMode, useState, type ReactNode } from "react";
import {
  createRootRoute,
  HeadContent,
  notFound,
  Outlet,
  redirect,
  Scripts,
} from "@tanstack/react-router";
import {
  getTranslationsSnapshot,
  GTProvider,
  useGT,
  useLocale,
  useSetLocale,
} from "gt-tanstack-start";
import { getLocaleDirection } from "generaltranslation";
import appCss from "#app/index.css?url";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { i18nProvider } from "fumadocs-ui/i18n";
import { i18n } from "../lib/i18n";
import { useFumadocsTranslations } from "../lib/layout.shared";
import { TooltipProvider } from "@disposabl/disposabl-kit/client/components/ui/tooltip";
import { Toaster } from "@disposabl/disposabl-kit/client/components/ui/sonner";
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";
import { ConvexProviderWithAuthKit } from "@convex-dev/workos";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { CookieConsentBanner } from "@disposabl/disposabl-kit/client/components/cookie-consent";
import { UpdateBanner } from "@convex-dev/static-hosting/react";
import { DirectionProvider } from "../components/ui/direction";

declare const __DOCS_ENABLED__: boolean;

export const Route = createRootRoute({
  /** Validate locale URLs once for every UI route. */
  beforeLoad: ({ params, location }) => {
    const lang =
      "lang" in params && typeof params.lang === "string"
        ? params.lang
        : undefined;

    if (lang && !i18n.languages.includes(lang)) throw notFound();

    if (lang === i18n.defaultLanguage) {
      const url = new URL(location.href, "https://routing.invalid");
      const remainder = url.pathname.split("/").slice(2).join("/");
      const pathname = `/${remainder.replace(/^\/+/, "")}`;
      throw redirect({
        href: `${pathname}${url.search}${url.hash}`,
        statusCode: 308,
        replace: true,
      });
    }

    return { locale: lang ?? i18n.defaultLanguage };
  },
  /** Use the URL locale for both server rendering and client hydration. */
  loader: async ({
    context,
  }): Promise<{
    locale: string;
    translations: Awaited<ReturnType<typeof getTranslationsSnapshot>>;
  }> => {
    const { locale } = context;
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

/** Render the document with GT translations and locale-specific text direction. */
function RootDocument({ children }: { children: ReactNode }) {
  const data = Route.useLoaderData();
  const locale = data?.locale ?? i18n.defaultLanguage;
  const translations = data?.translations;
  const direction = getLocaleDirection(locale);

  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <GTProvider locale={locale} translations={translations}>
          <StrictMode>
            <AppProviders direction={direction}>{children}</AppProviders>
          </StrictMode>
        </GTProvider>
        <Scripts />
      </body>
    </html>
  );
}

/** Connect shared UI and authentication providers to the active GT locale. */
function AppProviders({
  children,
  direction,
}: {
  children: ReactNode;
  direction: "ltr" | "rtl";
}) {
  const gt = useGT();
  const locale = useLocale();
  const setLocale = useSetLocale();
  const fumadocsTranslations = useFumadocsTranslations();
  const clientId = import.meta.env.VITE_WORKOS_CLIENT_ID;
  const [convex] = useState(() => {
    const url = import.meta.env.VITE_CONVEX_URL;
    if (!url) throw new Error("VITE_CONVEX_URL is not set");
    return new ConvexReactClient(url);
  });
  const content = (
    <RootProvider
      i18n={{
        ...i18nProvider(fumadocsTranslations, locale),
        onLocaleChange: setLocale,
      }}
      theme={{ enabled: true, enableSystem: true }}
      search={{
        enabled: __DOCS_ENABLED__,
        options: { type: "static", api: "/docs-search" },
      }}
      dir={direction}
    >
      <DirectionProvider dir={direction}>
        <TooltipProvider>
          {children}
          <Toaster dir={direction} />
          <CookieConsentBanner />
          <UpdateBanner
            message={gt("Update available")}
            buttonText={gt("Reload")}
            dismissable
          />
        </TooltipProvider>
      </DirectionProvider>
    </RootProvider>
  );

  return clientId ? (
    <AuthKitProvider
      clientId={clientId}
      redirectUri={
        typeof window === "undefined"
          ? undefined
          : `${window.location.origin}/callback`
      }
    >
      <ConvexProviderWithAuthKit client={convex} useAuth={useAuth}>
        {content}
      </ConvexProviderWithAuthKit>
    </AuthKitProvider>
  ) : (
    <ConvexProvider client={convex}>{content}</ConvexProvider>
  );
}
