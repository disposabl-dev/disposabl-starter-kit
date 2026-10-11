import eslint from "@eslint/js";
import type { Linter } from "eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

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
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    ...reactHooks.configs.flat.recommended,
    files: ["**/*.{ts,tsx}"],
  },
  eslintConfigPrettier,
  {
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
];

export default config;
