import * as cheerio from "cheerio";
import { safeGet } from "@/server/net/safeFetch";
import { loadRobots } from "./robots";

// Polite, bounded, same-site crawler for a hospital/clinic website. It starts
// at the admin-supplied URL and follows only same-host links, preferring pages
// that look like doctor / specialist / team listings.

export interface CrawledPage {
  url: string;
  html: string;
}

export interface CrawlOptions {
  maxPages?: number;
  maxDepth?: number;
  delayMs?: number;
  log?: (line: string) => void;
}

const DOCTOR_HINT = /doctor|physician|specialist|consultant|staff|team|gyn|obstet|ob-?gyn|women|maternity|our-people|medical-team|faculty|department/i;
const SKIP_EXT = /\.(pdf|jpe?g|png|gif|webp|svg|zip|docx?|xlsx?|pptx?|mp4|mp3|ico|css|js)(\?|$)/i;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function crawlSite(startUrl: string, opts: CrawlOptions = {}): Promise<CrawledPage[]> {
  const { maxPages = 12, maxDepth = 2, delayMs = 1500, log = () => {} } = opts;
  const start = new URL(startUrl);
  const robots = await loadRobots(start.origin);
  const seen = new Set<string>();
  const queue: { url: URL; depth: number; score: number }[] = [{ url: start, depth: 0, score: 10 }];
  const pages: CrawledPage[] = [];

  while (queue.length && pages.length < maxPages) {
    queue.sort((a, b) => b.score - a.score || a.depth - b.depth);
    const { url, depth } = queue.shift()!;
    url.hash = "";
    const key = url.toString();
    if (seen.has(key)) continue;
    seen.add(key);

    if (!robots.isAllowed(url)) {
      log(`skipped (robots.txt): ${url.pathname}`);
      continue;
    }
    if (pages.length > 0) await sleep(delayMs);

    let html: string;
    try {
      const res = await safeGet(key, { accept: "text/html,application/xhtml+xml" });
      if (res.status !== 200 || !/html/i.test(res.contentType)) {
        log(`skipped (${res.status} ${res.contentType.split(";")[0] || "unknown type"}): ${url.pathname}`);
        continue;
      }
      html = res.body.toString("utf8");
    } catch (e) {
      log(`failed: ${url.pathname} (${e instanceof Error ? e.message : "error"})`);
      continue;
    }
    pages.push({ url: key, html });
    log(`fetched: ${url.pathname}`);

    if (depth >= maxDepth) continue;
    const $ = cheerio.load(html);
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return;
      let next: URL;
      try {
        next = new URL(href, key);
      } catch {
        return;
      }
      if (next.hostname !== start.hostname || SKIP_EXT.test(next.pathname)) return;
      next.hash = "";
      if (seen.has(next.toString())) return;
      const text = $(el).text();
      const score = (DOCTOR_HINT.test(next.pathname) ? 5 : 0) + (DOCTOR_HINT.test(text) ? 3 : 0);
      if (score === 0 && depth >= 1) return; // second hop: only follow promising links
      queue.push({ url: next, depth: depth + 1, score });
    });
  }
  return pages;
}
