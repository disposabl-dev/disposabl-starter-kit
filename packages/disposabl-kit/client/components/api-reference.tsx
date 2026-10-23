import { createOpenAPIPageBase } from "fumadocs-openapi/ui/base";
import { createShikiFactory } from "fumadocs-core/highlight/shiki";
import { createBundledHighlighter } from "@shikijs/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { bundledLanguages } from "shiki/langs";
import { bundledThemes } from "shiki/themes";

const createHighlighter = createBundledHighlighter({
  langs: bundledLanguages,
  themes: bundledThemes,
  engine: () => createJavaScriptRegexEngine(),
});

export const ApiReference = createOpenAPIPageBase({
  shiki: createShikiFactory({
    init: () => createHighlighter({ langs: [], themes: [] }),
  }),
});
