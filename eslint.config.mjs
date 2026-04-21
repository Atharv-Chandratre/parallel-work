import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Stale repo copies left by the auto-claude worktree tooling. Not part
    // of our source; CI never sees them but local `npm run lint` does.
    ".auto-claude/**",
    // Playwright artifacts.
    "playwright-report/**",
    "test-results/**",
  ]),
  prettierConfig,
]);

export default eslintConfig;
