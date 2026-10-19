import { defineI18n } from "fumadocs-core/i18n";
import gtConfig from "../../../../apps/web/gt.config.json" with { type: "json" };

export const i18n = defineI18n({
  defaultLanguage: gtConfig.defaultLocale,
  languages: [...new Set([gtConfig.defaultLocale, ...gtConfig.locales])],
  parser: "dir",
  hideLocale: "default-locale",
});
