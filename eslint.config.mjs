import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Full jsx-a11y recommended rule set (README §13: WCAG 2.2 AA). eslint-config-next already
  // registers the jsx-a11y plugin (with only a few rules on), so we add the rules, not the plugin.
  {
    files: ["**/*.{jsx,tsx}"],
    rules: jsxA11y.flatConfigs.recommended.rules,
  },
  // Must stay last: turns off stylistic rules that would fight Prettier.
  prettier,
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated output:
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "public/models/**",
  ]),
]);

export default eslintConfig;
