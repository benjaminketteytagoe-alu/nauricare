import { safeGet } from "@/server/net/safeFetch";

// Minimal robots.txt support (RFC 9309): pick the group for our agent, else
// "*", and apply the longest matching Allow/Disallow rule. If robots.txt is
// unreachable or missing we treat everything as allowed, per the RFC; if it
// returns 401/403 we treat the whole site as disallowed (conservative).

const AGENT = "nauricarebot";

interface Rule {
  allow: boolean;
  path: string;
}

export interface RobotsPolicy {
  isAllowed(url: URL): boolean;
}

function parse(text: string): Rule[] {
  const groups: { agents: string[]; rules: Rule[] }[] = [];
  let current: { agents: string[]; rules: Rule[] } | null = null;
  let lastWasAgent = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((key === "allow" || key === "disallow") && current) {
      if (value) current.rules.push({ allow: key === "allow", path: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  const mine = groups.filter((g) => g.agents.some((a) => a !== "*" && AGENT.includes(a)));
  const chosen = mine.length ? mine : groups.filter((g) => g.agents.includes("*"));
  return chosen.flatMap((g) => g.rules);
}

function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const re = new RegExp("^" + body.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (anchored ? "$" : ""));
  return re.test(path);
}

export async function loadRobots(origin: string): Promise<RobotsPolicy> {
  let rules: Rule[] = [];
  try {
    const res = await safeGet(`${origin}/robots.txt`, { maxBytes: 500_000, timeoutMs: 10_000, accept: "text/plain" });
    if (res.status === 401 || res.status === 403) return { isAllowed: () => false };
    if (res.status >= 200 && res.status < 300) rules = parse(res.body.toString("utf8"));
  } catch {
    // unreachable robots.txt: allowed (RFC 9309 section 2.3.1.4 treats network errors as unavailable)
  }
  return {
    isAllowed(url: URL) {
      const path = url.pathname + url.search;
      let best: Rule | null = null;
      for (const rule of rules) {
        if (matches(rule.path, path) && (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.allow))) {
          best = rule;
        }
      }
      return !best || best.allow;
    },
  };
}
