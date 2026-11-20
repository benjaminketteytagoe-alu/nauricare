// Prints a Markdown coverage table from a Vitest/istanbul json-summary file.
// Usage: node .github/scripts/coverage-summary.mjs apps/web/coverage/coverage-summary.json
import { existsSync, readFileSync } from "node:fs";

const file = process.argv[2];
if (!file || !existsSync(file)) process.exit(0);
const { total } = JSON.parse(readFileSync(file, "utf8"));
const rows = ["lines", "statements", "functions", "branches"].map(
  (k) => `| ${k} | ${total[k].pct}% | ${total[k].covered}/${total[k].total} |`,
);
console.log(["### Unit test coverage (lib + server)", "| Metric | % | Covered |", "|---|---|---|", ...rows].join("\n"));
