import { StrictMode, useState, type ReactNode } from "react";
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
  useGT,
} from "gt-tanstack-start";
import { getLocaleDirection } from "generaltranslation";
import appCss from "../index.css?url";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { TooltipProvider } from "@disposabl/disposabl-kit/client/components/ui/tooltip";
import { Toaster } from "@disposabl/disposabl-kit/client/components/ui/sonner";
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";
import { ConvexProviderWithAuthKit } from "@convex-dev/workos";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { CookieConsentBanner } from "@disposabl/disposabl-kit/client/components/cookie-consent";
import { UpdateBanner } from "@convex-dev/static-hosting/react";

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

function AppProviders({
  children,
  direction,
}: {
  children: ReactNode;
  direction: "ltr" | "rtl";
}) {
  const gt = useGT();
  const clientId = import.meta.env.VITE_WORKOS_CLIENT_ID;
  const [convex] = useState(() => {
    const url = import.meta.env.VITE_CONVEX_URL;
    if (!url) throw new Error("VITE_CONVEX_URL is not set");
    return new ConvexReactClient(url);
  });
  const content = (
    <RootProvider theme={{ enabled: true, enableSystem: true }} dir={direction}>
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
