import {
  createElement,
  StrictMode,
  type ComponentProps,
  type ReactNode,
} from "react";
import { AuthKitProvider } from "@workos-inc/authkit-react";
import { ConvexProviderWithAuth, type ConvexReactClient } from "convex/react";
import { TooltipProvider } from "../components/ui/tooltip";
import { useAuthFromAuthKit } from "./auth";
import { ErrorBoundary } from "./error-boundary";
import { ThemeProvider } from "./theme";

export {
  ErrorBoundary,
  ErrorRecovery,
  RouteErrorBoundary,
} from "./error-boundary";
export { ThemeProvider, useTheme } from "./theme";

export type AuthKitOptions = Omit<
  ComponentProps<typeof AuthKitProvider>,
  "children"
>;
export type ProvidersProps = {
  children: ReactNode;
  auth?: AuthKitOptions & { client: ConvexReactClient };
  theme?: Omit<ComponentProps<typeof ThemeProvider>, "children">;
  showErrorDetails?: boolean;
};

export function Providers({
  children,
  auth,
  theme,
  showErrorDetails = false,
}: ProvidersProps) {
  let content = children;
  if (auth) {
    const { client, ...options } = auth;
    content = createElement(AuthKitProvider, {
      ...options,
      children: createElement(ConvexProviderWithAuth, {
        client,
        useAuth: useAuthFromAuthKit,
        children: content,
      }),
    });
  }

  return createElement(StrictMode, {
    children: createElement(ErrorBoundary, {
      showDetails: showErrorDetails,
      children: createElement(ThemeProvider, {
        ...theme,
        children: createElement(TooltipProvider, { children: content }),
      }),
    }),
  });
}
