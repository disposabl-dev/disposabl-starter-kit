---
title: Interface translations
description: Translate buttons, labels, and other app text.
---

Use General Translation's React helpers for interface strings. Existing app components use `T` for text and `useGT` when they need a translated string value.

## Generate catalog entries

Run from the repository root:

```sh
bun run --cwd apps/web gt generate
```

The configured output is `apps/web/src/_gt/[locale].json`. Review the generated diff and fill in the translations.

Generation discovers strings. It does not guarantee that translated values are complete or correct.

## Add a language

Update `apps/web/gt.config.json`, add its catalog and written content, then check the language selector and URLs.

## Review the result

Switch languages, follow links, and reload a page. Check labels, dialogs, dates, and text direction.

Keep [Markdown content translations](/docs/localization/content) in a separate review.
