import { StrictMode, type ComponentProps, type ReactNode } from "react";
import { AuthKitProvider } from "@workos-inc/authkit-react";
import { ConvexProviderWithAuth, type ConvexReactClient } from "convex/react";
import { TooltipProvider } from "../components/ui/tooltip";
import { useAuthFromAuthKit } from "./auth";
import { ErrorBoundary } from "./error-boundary";
import { ThemeProvider } from "./theme";
import { I18nProvider, type I18nOptions } from "./i18n";
import {
  CookieConsentBanner,
  type CookieConsentOptions,
} from "../components/cookie-consent";
import { type useDeploymentUpdates } from "@convex-dev/static-hosting/react";
import { DeploymentUpdateNotice } from "../components/deployment-update-notice";

export {
  CookieConsentBanner,
  showCookiePreferences,
  acceptedCookieCategory,
  type CookieConsentOptions,
} from "../components/cookie-consent";

export { ErrorBoundary, RouteErrorBoundary } from "./error-boundary";
export { ThemeProvider, useTheme } from "./theme";
export {
  I18nProvider,
  type I18nOptions,
  type TranslationCatalog,
} from "./i18n";

export type AuthKitOptions = Omit<
  ComponentProps<typeof AuthKitProvider>,
  "children"
>;
export type ProvidersProps = {
  query: Parameters<typeof useDeploymentUpdates>[0];
  children: ReactNode;
  auth: AuthKitOptions & { client: ConvexReactClient };
  theme?: Omit<ComponentProps<typeof ThemeProvider>, "children">;
  i18n?: I18nOptions;
  production?: boolean;
  consent?: CookieConsentOptions;
};

export function Providers({
  children,
  query,
  auth,
  theme,
  i18n,
  consent,
  production = process.env.NODE_ENV === "production",
}: ProvidersProps) {
  const { client, ...options } = auth;
  return (
    <StrictMode>
      <I18nProvider options={i18n}>
        <ErrorBoundary production={production}>
          <ThemeProvider {...theme}>
            <AuthKitProvider {...options}>
              <ConvexProviderWithAuth
                client={client}
                useAuth={useAuthFromAuthKit}
              >
                <TooltipProvider>
                  {children}
                  {consent && production && (
                    <CookieConsentBanner options={consent} />
                  )}
                  <DeploymentUpdateNotice query={query} />
                </TooltipProvider>
              </ConvexProviderWithAuth>
            </AuthKitProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </I18nProvider>
    </StrictMode>
  );
}
