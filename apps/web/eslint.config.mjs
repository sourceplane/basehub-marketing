// eslint-config-next 16 ships flat configs; upstream's `.eslintrc.json`
// extended `next/core-web-vitals` and `next/typescript`, the same two.
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // React Compiler rules that eslint-config-next 16 added after the
    // template was written; its hooks are kept as written.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
    },
  },
  globalIgnores([".next/**", ".open-next/**", ".wrangler/**", "next-env.d.ts", "basehub-types.d.ts"]),
]);
