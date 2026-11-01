import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintConfigPrettier,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "src/lib/database.types.ts"]),
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs}"],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/data/admin_db",
              message:
                "The Firestore façade was deleted. Use supabaseAdmin from @/data/supabase or adminAuth from @/data/adminAuth.",
            },
          ],
          patterns: [
            {
              group: ["**/admin_db", "**/admin_db.*"],
              message:
                "The Firestore façade was deleted. Use supabaseAdmin from @/data/supabase or adminAuth from @/data/adminAuth.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
