import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Static guardrails for every route handler, so new routes follow the same
// rules as the existing ones. Each exemption names its reason.

const API_DIR = __dirname;

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return routeFiles(path);
    return name === "route.ts" ? [path] : [];
  });
}

const routes = routeFiles(API_DIR).map((path) => ({
  path: relative(API_DIR, path),
  source: readFileSync(path, "utf8"),
}));

const WRITE_EXPORT = /export\s+(?:async\s+function|const)\s+(POST|PUT|PATCH|DELETE)\b/;

/** Write endpoints without their own per-route limit, and why that is safe. */
const RATE_LIMIT_EXEMPT: Record<string, string> = {
  "auth/[...nextauth]/route.ts": "NextAuth handler; credential sign-in is limited inside authorize()",
};

describe("API route conventions", () => {
  it("finds the route handlers", () => {
    expect(routes.length).toBeGreaterThan(50);
  });

  it.each(routes)("$path reads the caller through lib/auth-guards", ({ source }) => {
    expect(source).not.toMatch(/\bgetServerSession\b/);
  });

  it.each(routes)("$path parses bodies through lib/api", ({ source }) => {
    expect(source).not.toMatch(/\b(req|request)\.json\(\)/);
  });

  it.each(routes)("$path logs through lib/logger", ({ source }) => {
    expect(source).not.toMatch(/\bconsole\.(log|info|warn|error|debug)\b/);
  });

  it.each(routes.filter((r) => WRITE_EXPORT.test(r.source)))("$path rate-limits writes", ({ path, source }) => {
    if (RATE_LIMIT_EXEMPT[path]) return;
    expect(source, `${path} needs enforceRateLimit() or an entry in RATE_LIMIT_EXEMPT`).toMatch(
      /\b(enforceRateLimit|rateLimit)\(/,
    );
  });

  it("keeps the exemption list honest", () => {
    const paths = new Set(routes.map((r) => r.path));
    for (const path of Object.keys(RATE_LIMIT_EXEMPT)) expect(paths.has(path), path).toBe(true);
  });
});
