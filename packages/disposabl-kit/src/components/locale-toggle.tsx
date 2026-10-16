import { LocaleSelector, useGT, useLocales } from "gt-react";

export function LocaleToggle() {
  const gt = useGT();
  const locales = useLocales();
  if (locales.length < 2) return null;
  return <LocaleSelector aria-label={gt("Change language")} />;
}
