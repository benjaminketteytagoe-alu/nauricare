// Fails on high/critical advisories in runtime dependencies unless they are
// listed, with a reason and an unexpired date, in .github/audit-allowlist.json.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const LEVELS = ["high", "critical"];
const allow = JSON.parse(readFileSync(".github/audit-allowlist.json", "utf8")).advisories;
const today = new Date().toISOString().slice(0, 10);

let raw;
try {
  raw = execSync("npm audit --omit=dev --json", { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  raw = e.stdout; // npm audit exits non-zero when it finds anything
}
const { vulnerabilities = {} } = JSON.parse(raw);

const found = new Map();
for (const v of Object.values(vulnerabilities)) {
  for (const via of v.via) {
    if (typeof via !== "object" || !LEVELS.includes(via.severity)) continue;
    const id = via.url?.split("/").pop();
    if (id) found.set(id, { id, pkg: via.name, severity: via.severity, title: via.title, url: via.url });
  }
}

let failed = false;
for (const a of found.values()) {
  const entry = allow.find((x) => x.id === a.id);
  if (!entry) {
    console.log(`::error::${a.severity} ${a.pkg}: ${a.title} (${a.url})`);
    failed = true;
  } else if (entry.expires < today) {
    console.log(
      `::error::Allowlist entry for ${a.id} (${a.pkg}) expired on ${entry.expires}. Fix it or renew with a reason.`,
    );
    failed = true;
  } else {
    console.log(`::warning::Accepted until ${entry.expires}: ${a.pkg} ${a.id}: ${entry.reason}`);
  }
}
for (const e of allow)
  if (!found.has(e.id)) console.log(`::notice::${e.id} no longer reported; remove it from the allowlist.`);
console.log(
  failed ? "Unaccepted high/critical advisories found." : `OK: ${found.size} high/critical advisories, all accepted.`,
);
process.exit(failed ? 1 : 0);
