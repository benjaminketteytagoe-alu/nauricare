import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": src,
      // `server-only` throws outside React Server bundles; tests run in plain Node.
      "server-only": fileURLToPath(new URL("./test/empty-module.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/server/**"],
      // Browser-only modules (React hooks, localStorage) are exercised by the
      // Playwright suite; the Prisma singleton and static data have no logic.
      exclude: [
        "**/*.test.*",
        "src/lib/hooks/**",
        "src/lib/useTurnstileSize.ts",
        "src/lib/authDestination.ts",
        "src/lib/triage/guestStorage.ts",
        "src/lib/prisma.ts",
        "src/lib/countries.ts",
      ],
      reporter: ["text-summary", "json-summary", "lcov"],
      // CI fails below these. Raise them as coverage grows; never lower them
      // to get a PR through. Safety-critical modules (triage, encryption, auth,
      // data sharing and deletion) carry a stricter per-file floor.
      thresholds: {
        statements: 70,
        lines: 70,
        functions: 70,
        branches: 62,
        "src/lib/triage/{engine,redFlags,claimToken}.ts": { statements: 95, branches: 85 },
        "src/server/security/**": { statements: 95, branches: 90 },
        "src/lib/{auth-guards,sanitize,safeRedirect,api}.ts": { statements: 90, branches: 85 },
        "src/lib/cycle/predict.ts": { statements: 95, branches: 90 },
        "src/server/{auth/loginCode.service,referrals/share.service,account/deletion.service}.ts": {
          statements: 90,
          branches: 80,
        },
      },
    },
  },
});
