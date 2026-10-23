---
title: Translated content
description: Write documentation in each supported language.
---

Documentation lives in `apps/docs/<locale>/`. Each file is Markdown with a title and description.

## Match page paths

For example, an English authentication overview belongs at `apps/docs/en/authentication/index.md`. Its French version belongs at `apps/docs/fr/authentication/index.md`.

Keep the same path after the language directory so the loader can match the pages.

## Missing translations

The docs loader falls back to the default language for missing pages. These new guides start in English.

A translated navigation label does not mean that the page body has been translated.

## Translation workflow

Review the source page, write its translated Markdown file, and check it in the selected language.

`gt generate` handles interface catalogs. It does not translate the Markdown body. Translating Markdown through a hosted service is a separate workflow.
