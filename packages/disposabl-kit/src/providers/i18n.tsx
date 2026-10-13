import {
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  createOrUpdateBrowserConditionStore,
  GTProvider,
  initializeGT,
  useLocale,
  useLocaleDirection,
} from "gt-react";
import { DirectionProvider } from "../components/ui/direction";

export type TranslationCatalog = ComponentProps<
  typeof GTProvider
>["translations"][string];

export type I18nOptions = {
  defaultLocale?: string;
  translations?: Record<string, TranslationCatalog>;
};

export function I18nProvider({
  children,
  options,
}: {
  children: ReactNode;
  options?: I18nOptions;
}) {
  const translations = Object.fromEntries(
    Object.entries(options?.translations ?? {}).map(([path, catalog]) => [
      path
        .split("/")
        .at(-1)!
        .replace(/\.json$/, ""),
      catalog,
    ]),
  );
  const [locale] = useState(() => {
    initializeGT({
      defaultLocale: options?.defaultLocale ?? "en",
      locales: Object.keys(translations),
      cacheUrl: null,
      runtimeUrl: null,
      cacheExpiryTime: null,
    });
    return createOrUpdateBrowserConditionStore({}).getLocale();
  });

  return (
    <GTProvider locale={locale} translations={translations}>
      <DocumentLocale>{children}</DocumentLocale>
    </GTProvider>
  );
}

function DocumentLocale({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const direction = useLocaleDirection();
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
  }, [locale, direction]);
  return <DirectionProvider dir={direction}>{children}</DirectionProvider>;
}
