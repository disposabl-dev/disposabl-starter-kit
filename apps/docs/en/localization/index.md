---
title: Translations
description: Use multiple languages in your interface and content.
---

The web app uses General Translation for interface text and Fumadocs for documentation.

The language configuration lives in `apps/web/gt.config.json`. English is the default, with Spanish, French, Japanese, and Arabic configured.

## Interface text

The app loads local translation catalogs. Add translatable UI strings and generate catalog entries before reviewing translations.

See [interface translations](/docs/localization/interface).

## Written content

Docs use a Markdown file for each language. Interface catalogs do not automatically translate article text.

See [translated content](/docs/localization/content).

## URLs and direction

Default-language pages use unprefixed URLs. Other languages use a locale prefix, such as `/ar/docs`.

The document direction follows the language. Check Arabic pages with the actual interface to catch layout problems.
