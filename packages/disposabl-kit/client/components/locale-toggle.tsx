import { LocaleSelector, useGT, useLocales } from "gt-tanstack-start";

export function LocaleToggle() {
  const gt = useGT();
  const locales = useLocales();
  if (locales.length < 2) return null;

  return (
    <LocaleSelector
      aria-label={gt("Choose a language")}
      className="rounded-md border bg-background px-2 py-1 text-sm"
    />
  );
}
