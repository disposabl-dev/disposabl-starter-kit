import { StrictMode, useEffect, type ReactNode } from "react";
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";
import { ConvexProviderWithAuthKit } from "@convex-dev/workos";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "../components/ui/tooltip";
import { Toaster } from "../components/ui/sonner";
import { DirectionProvider } from "../components/ui/direction";
import { useGT, useLocale, useLocaleDirection } from "gt-react";
import { CookieConsentBanner } from "../components/cookie-consent";
import { UpdateBanner } from "@convex-dev/static-hosting/react";

let convexClient: ConvexReactClient | undefined;

export function Providers({
  children,
  env,
}: {
  children: ReactNode;
  env: {
    VITE_CONVEX_URL?: string;
    VITE_WORKOS_CLIENT_ID?: string;
  };
}) {
  const url = env.VITE_CONVEX_URL;
  if (!url) throw new Error("VITE_CONVEX_URL is not set");
  const convex = (convexClient ??= new ConvexReactClient(url));
  const locale = useLocale();
  const direction = useLocaleDirection();
  const gt = useGT();
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
  }, [locale, direction]);
  const content = (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      storageKey="vite-ui-theme"
    >
      <DirectionProvider dir={direction}>
        <TooltipProvider>
          {children}
          <Toaster />
          <CookieConsentBanner
            options={{ description: "This is a test", sections: [] }}
          />
          <UpdateBanner
            message={gt("Update available")}
            buttonText={gt("Reload")}
            dismissable={true}
          />
        </TooltipProvider>
      </DirectionProvider>
    </ThemeProvider>
  );
  const clientId = env.VITE_WORKOS_CLIENT_ID;
  return (
    <StrictMode>
      {clientId ? (
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
      )}
    </StrictMode>
  );
}
