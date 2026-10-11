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
  { ignores: ["**/node_modules/**", "**/dist/**", "**/.turbo/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    ...reactHooks.configs.flat.recommended,
    files: ["**/*.{jsx,tsx}"],
  },
  eslintConfigPrettier,
  {
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
];

export default config;
