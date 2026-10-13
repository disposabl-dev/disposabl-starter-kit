import eslint from "@eslint/js";
import type { Linter } from "eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import gtLint from "@generaltranslation/react-core-linter";

type Config = Linter.Config & {
  languageOptions?: Linter.LanguageOptions;
};

const config: Config[] = [
  {
    ignores: [
      "**/node_modules/**",
      "**/.turbo/**",
      "**/.cache/**",
      "**/dist/**",
      "**/dist-ssr/**",
      "**/coverage/**",
      "**/_generated/**",
      "**/routeTree.gen.ts",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser, Bun: "readonly" },
    },
  },
  {
    ...reactHooks.configs.flat.recommended,
    files: ["**/*.{ts,tsx}"],
  },
  gtLint.configs!.recommended as Config,
  eslintConfigPrettier,
  {
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
];

export default config;
