import { LocaleSelector, useGT, useLocales } from "gt-react";

export function LocaleToggle() {
  const gt = useGT();
  const locales = useLocales();
  if (locales.length < 2) return null;
  return (
    <LocaleSelector
      aria-label={gt("Change language")}
      className="h-9 max-w-32 rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />
  );
}
