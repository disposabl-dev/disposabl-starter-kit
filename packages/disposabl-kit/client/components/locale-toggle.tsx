import { LocaleSelector, useGT, useLocales } from "gt-tanstack-start";

export function LocaleToggle() {
  const gt = useGT();
  const locales = useLocales();
  if (locales.length < 2) return null;

  return (
    <span className="relative inline-flex shrink-0 items-center">
      <LocaleSelector
        aria-label={gt("Choose a language")}
        className="appearance-none border bg-background py-1 ps-2 pe-8 text-sm"
      />
      <svg
        className="pointer-events-none absolute end-2 size-3.5"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path d="m5 7.5 5 5 5-5" />
      </svg>
    </span>
  );
}
