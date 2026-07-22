import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
    "tests/**",
  ]),
  {
    rules: {
      // These effects intentionally sync with external systems (sessionStorage
      // hydration, fetch-on-mount) which cannot run during SSR. Downgraded from
      // error to warning; the pattern is deliberate and documented.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
