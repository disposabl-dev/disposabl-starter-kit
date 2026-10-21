import { LocaleSelector, useGT, useLocales } from "gt-tanstack-start";

export function LocaleToggle() {
  const gt = useGT();
  const locales = useLocales();
  if (locales.length < 2) return null;

  return (
    <LocaleSelector
      aria-label={gt("Choose a language")}
      className="border bg-background py-1 ps-2 pe-4 text-sm"
    />
  );
}
