import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: { attributes: false } }],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
          pathGroups: [{ pattern: "@/**", group: "internal" }],
          "newlines-between": "never",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    },
  },
  {
    // Server code logs through src/lib/logger.ts (structured JSON, PHI redaction), never console.
    files: [
      "src/app/api/**/*.ts",
      "src/server/**/*.ts",
      "src/lib/**/*.ts",
      "src/actions/**/*.ts",
      "src/**/actions.ts",
      "src/proxy.ts",
      "src/instrumentation.ts",
    ],
    rules: {
      "no-console": "off",
      "no-restricted-globals": [
        "error",
        { name: "console", message: "Server code logs through `logger` from @/lib/logger (structured, redacted)." },
      ],
    },
  },
  {
    // One way to read the caller: the guards in src/lib/auth-guards.ts.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/auth-guards.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: ["next-auth", "next-auth/next"].map((name) => ({
            name,
            importNames: ["getServerSession"],
            message: "Use requireApiUser, getSessionUser or requireRole from @/lib/auth-guards.",
          })),
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
]);
