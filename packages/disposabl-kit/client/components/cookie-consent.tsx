"use client";

import { useEffect, useMemo, useRef } from "react";
import { useGT, useLocale, useLocaleDirection } from "gt-react";
import * as CookieConsent from "vanilla-cookieconsent";
import "../styles/cookie-consent.css";

// Serialize the library's async setup and teardown, including React StrictMode.
let lifecycle = Promise.resolve();

/** Essential-cookie information. Mount once beneath GTProvider. */
export function CookieConsentBanner() {
  const root = useRef<HTMLDivElement>(null);
  const gt = useGT();
  const locale = useLocale();
  const direction = useLocaleDirection();
  const translation = useMemo<CookieConsent.Translation>(
    () => ({
      consentModal: {
        title: gt("Cookie preferences"),
        description: gt(
          "We use only essential cookies to keep this site working and remember your preferences.",
        ),
        acceptAllBtn: gt("Got it"),
        showPreferencesBtn: gt("Manage preferences"),
      },
      preferencesModal: {
        title: gt("Cookie preferences"),
        acceptAllBtn: gt("Got it"),
        savePreferencesBtn: gt("Save preferences"),
        closeIconLabel: gt("Close"),
        sections: [
          {
            title: gt("Essential cookies"),
            description: gt(
              "These cookies support core site functions, sign-in, and your saved preferences. They are always enabled.",
            ),
            linkedCategory: "necessary",
          },
        ],
      },
    }),
    [gt],
  );

  useEffect(() => {
    let cancelled = false;
    const container = root.current;
    lifecycle = lifecycle
      .then(async () => {
        if (cancelled || !container) return;
        await CookieConsent.run({
          root: container,
          mode: "opt-in",
          revision: 0,
          cookie: { name: "cc_cookie", expiresAfterDays: 182, sameSite: "Lax" },
          categories: { necessary: { enabled: true, readOnly: true } },
          language: {
            default: locale,
            rtl: direction === "rtl" ? [locale] : [],
            translations: { [locale]: translation },
          },
        });
      })
      .catch((error: unknown) => {
        console.error("Could not initialize cookie preferences.", error);
      });
    return () => {
      cancelled = true;
      lifecycle = lifecycle.then(() => CookieConsent.reset(false));
    };
  }, [locale, direction, translation]);

  return <div ref={root} className="cookie-consent" />;
}

export function showCookiePreferences() {
  CookieConsent.showPreferences();
}

export function acceptedCookieCategory(category: string) {
  return (
    CookieConsent.validConsent() && CookieConsent.acceptedCategory(category)
  );
}
