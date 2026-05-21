import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    plugins: { import: importPlugin, "simple-import-sort": simpleImportSort },
    files: ["**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    rules: {
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
      // rely on core `no-unused-vars` + import/no-unused-modules for unused code
      // report unused exports/modules (helps find files or modules not referenced)
      "import/no-unused-modules": ["warn", { unusedExports: true, missingExports: false }],
      // sort imports consistently
      "simple-import-sort/imports": [
        "warn",
        {
          groups: [
            ["^react", "^@?\w"],
            ["^@/services", "^@services"],
            ["^@/components", "^@components"],
            ["^@/pages", "^@pages"],
            ["^@/styles", "^@styles"],
            ["^.."],
            ["^\./"],
          ],
        },
      ],
      "simple-import-sort/exports": "warn",
    },
  },
]);
