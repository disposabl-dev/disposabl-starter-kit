import { useEffect, useMemo, useRef } from "react";
import { useGT, useLocale, useLocales } from "gt-react";
import * as CookieConsent from "vanilla-cookieconsent";
import "vanilla-cookieconsent/dist/cookieconsent.css";

export type CookieConsentOptions = Omit<
  CookieConsent.CookieConsentConfig,
  "language" | "categories" | "root"
> & {
  categories?: CookieConsent.CookieConsentConfig["categories"];
  /** App-specific translated policy text and category descriptions. HTML is supported. */
  description: string;
  sections: CookieConsent.Section[];
};

/** Mount once per app, inside I18nProvider. Keep options stable between renders. */
export function CookieConsentBanner({
  options,
}: {
  options: CookieConsentOptions;
}) {
  const root = useRef<HTMLDivElement>(null);
  const gt = useGT();
  const locale = useLocale();
  const locales = useLocales();
  const translation = useMemo<CookieConsent.Translation>(
    () => ({
      consentModal: {
        title: gt("Cookie preferences"),
        description: options.description,
        acceptAllBtn: gt("Accept all"),
        acceptNecessaryBtn: gt("Reject optional cookies"),
        showPreferencesBtn: gt("Manage preferences"),
      },
      preferencesModal: {
        title: gt("Cookie preferences"),
        acceptAllBtn: gt("Accept all"),
        acceptNecessaryBtn: gt("Reject optional cookies"),
        savePreferencesBtn: gt("Save preferences"),
        closeIconLabel: gt("Close"),
        sections: options.sections,
      },
    }),
    [gt, options.description, options.sections],
  );
  const currentTranslation = useRef(translation);
  const initial = useRef({ options, locale, locales });

  useEffect(() => {
    currentTranslation.current = translation;
    void CookieConsent.setLanguage(locale, true);
  }, [translation, locale]);

  useEffect(() => {
    const { options, locale, locales } = initial.current;
    const {
      description: _description,
      sections: _sections,
      categories,
      ...config
    } = options;
    void _description;
    void _sections;
    void CookieConsent.run({
      ...config,
      root: root.current,
      mode: "opt-in",
      categories: {
        ...categories,
        necessary: { enabled: true, readOnly: true },
      },
      language: {
        default: locale,
        rtl: ["ar", "he", "fa", "ur"],
        translations: Object.fromEntries(
          [...new Set([locale, ...locales])].map((language) => [
            language,
            () => currentTranslation.current,
          ]),
        ),
      },
    });
    return () => CookieConsent.reset(false);
  }, []);

  return (
    <div
      ref={root}
      className="[--cc-font-family:var(--font-sans,_inherit)] [--cc-modal-border-radius:var(--radius)] [--cc-btn-border-radius:calc(var(--radius)_*_0.8)] [--cc-bg:var(--popover)] [--cc-primary-color:var(--popover-foreground)] [--cc-secondary-color:var(--muted-foreground)] [--cc-link-color:var(--foreground)] [--cc-btn-primary-bg:var(--primary)] [--cc-btn-primary-color:var(--primary-foreground)] [--cc-btn-primary-border-color:var(--primary)] [--cc-btn-primary-hover-bg:color-mix(_in_oklab,_var(--primary)_90%,_transparent_)] [--cc-btn-primary-hover-color:var(--primary-foreground)] [--cc-btn-primary-hover-border-color:var(--primary)] [--cc-btn-secondary-bg:var(--secondary)] [--cc-btn-secondary-color:var(--secondary-foreground)] [--cc-btn-secondary-border-color:var(--border)] [--cc-btn-secondary-hover-bg:var(--accent)] [--cc-btn-secondary-hover-color:var(--accent-foreground)] [--cc-btn-secondary-hover-border-color:var(--border)] [--cc-separator-border-color:var(--border)] [--cc-section-category-border:var(--border)] [--cc-webkit-scrollbar-bg:var(--muted)] [--cc-webkit-scrollbar-hover-bg:var(--accent)] [--cc-toggle-enabled-icon-color:var(--primary-foreground)] [--cc-toggle-disabled-icon-color:var(--foreground)] [--cc-toggle-on-bg:var(--primary)] [--cc-toggle-off-bg:var(--muted-foreground)] [--cc-toggle-on-knob-bg:var(--primary-foreground)] [--cc-toggle-off-knob-bg:var(--background)] [--cc-toggle-readonly-bg:var(--muted)] [--cc-toggle-readonly-knob-bg:var(--background)] [--cc-toggle-readonly-knob-icon-color:var(--muted-foreground)] [--cc-cookie-category-block-bg:var(--muted)] [--cc-cookie-category-block-border:var(--border)] [--cc-cookie-category-block-hover-bg:var(--accent)] [--cc-cookie-category-block-hover-border:var(--border)] [--cc-cookie-category-expanded-block-hover-bg:var(--accent)] [--cc-footer-bg:var(--muted)] [--cc-footer-color:var(--muted-foreground)] [--cc-footer-border-color:var(--border)] [--cc-overlay-bg:rgb(0_0_0_/_50%)] [&_button:focus-visible]:!outline-2 [&_button:focus-visible]:!outline-ring [&_button:focus-visible]:!outline-offset-2 [&_a:focus-visible]:!outline-2 [&_a:focus-visible]:!outline-ring [&_a:focus-visible]:!outline-offset-2 [&_input:focus-visible]:!outline-2 [&_input:focus-visible]:!outline-ring [&_input:focus-visible]:!outline-offset-2"
    />
  );
}

export function showCookiePreferences() {
  CookieConsent.showPreferences();
}

export function acceptedCookieCategory(category: string) {
  return CookieConsent.acceptedCategory(category);
}
