import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";
import * as CookieConsent from "vanilla-cookieconsent";
import {
  CookieConsentBanner,
  showCookiePreferences,
} from "../src/components/cookie-consent";
import { I18nProvider } from "../src/providers/i18n";

test("optional services require consent and can be withdrawn in StrictMode", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const onAccept = vi.fn();
  const onReject = vi.fn();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(
        <StrictMode>
          <I18nProvider>
            <CookieConsentBanner
              options={{
                description: "Choose whether to enable optional analytics.",
                hideFromBots: false,
                categories: {
                  analytics: { services: { example: { onAccept, onReject } } },
                },
                sections: [{ title: "Analytics", linkedCategory: "analytics" }],
              }}
            />
          </I18nProvider>
        </StrictMode>,
      );
    });
    await vi.waitFor(() =>
      expect(document.querySelector("#cc-main")).not.toBeNull(),
    );
    expect(CookieConsent.acceptedCategory("analytics")).toBe(false);
    expect(onAccept).not.toHaveBeenCalled();
    CookieConsent.acceptCategory("all");
    expect(CookieConsent.acceptedCategory("analytics")).toBe(true);
    expect(onAccept).toHaveBeenCalledOnce();
    showCookiePreferences();
    expect(CookieConsent.getConfig("mode")).toBe("opt-in");
    CookieConsent.acceptCategory("necessary");
    expect(CookieConsent.acceptedCategory("analytics")).toBe(false);
    expect(onReject).toHaveBeenCalledOnce();
  } finally {
    await act(() => root.unmount());
    CookieConsent.reset(true);
    container.remove();
  }
});
