import { lookup } from "dns";
import http from "http";
import https from "https";
import { isIP } from "net";

// SSRF-safe HTTP(S) GET for fetching URLs that come from users or admins
// (e.g. the provider sourcing crawler). The destination IP is validated at
// connect time inside the socket's DNS lookup, so DNS rebinding can't swap a
// public address for an internal one (cloud metadata, VPC, localhost) after
// the check. Redirects are followed manually and re-validated.

export class SafeFetchError extends Error {}

const BLOCKED_V4: [number, number][] = [
  [0x00000000, 8], [0x0a000000, 8], [0x64400000, 10], [0x7f000000, 8], [0xa9fe0000, 16],
  [0xac100000, 12], [0xc0000000, 24], [0xc0000200, 24], [0xc0a80000, 16], [0xc6120000, 15],
  [0xc6336400, 24], [0xcb007100, 24], [0xe0000000, 4], [0xf0000000, 4],
];

function v4ToInt(ip: string): number {
  return ip.split(".").reduce((n, o) => (n << 8) + Number(o), 0) >>> 0;
}

export function isPublicAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) {
    const n = v4ToInt(ip);
    return !BLOCKED_V4.some(([base, bits]) => (n >>> (32 - bits)) === (base >>> (32 - bits)));
  }
  if (family === 6) {
    const v = ip.toLowerCase();
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPublicAddress(mapped[1]);
    if (v === "::" || v === "::1") return false;
    if (/^f[cd]/.test(v) || /^fe[89ab]/.test(v) || /^ff/.test(v)) return false; // ULA, link-local, multicast
    if (v.startsWith("64:ff9b:") || v.startsWith("2001:db8:")) return false;
    return true;
  }
  return false;
}

const guardedLookup: typeof lookup = ((hostname: string, options: unknown, callback: unknown) => {
  const cb = (typeof options === "function" ? options : callback) as (
    err: NodeJS.ErrnoException | null, address: string | { address: string; family: number }[], family?: number,
  ) => void;
  const opts = (typeof options === "object" && options) || {};
  lookup(hostname, { ...opts, all: true }, (err, addresses) => {
    if (err) return cb(err, "");
    const list = addresses as { address: string; family: number }[];
    const bad = list.find((a) => !isPublicAddress(a.address));
    if (!list.length || bad) {
      return cb(new SafeFetchError(`Blocked non-public address for ${hostname}`) as NodeJS.ErrnoException, "");
    }
    if ((opts as { all?: boolean }).all) return cb(null, list);
    cb(null, list[0].address, list[0].family);
  });
}) as typeof lookup;

export interface SafeResponse {
  url: string;
  status: number;
  contentType: string;
  body: Buffer;
}

export interface SafeFetchOptions {
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
  accept?: string;
  userAgent?: string;
}

export const CRAWLER_USER_AGENT = "NauriCareBot/1.0 (+https://nauricare.org; provider directory verification)";

export async function safeGet(rawUrl: string, opts: SafeFetchOptions = {}): Promise<SafeResponse> {
  const { maxBytes = 2_000_000, timeoutMs = 15_000, maxRedirects = 3, accept = "*/*", userAgent = CRAWLER_USER_AGENT } = opts;
  let url = new URL(rawUrl);
  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new SafeFetchError("Only http(s) URLs are allowed");
    if (url.username || url.password) throw new SafeFetchError("Credentials in URLs are not allowed");
    if (isIP(url.hostname.replace(/^\[|\]$/g, "")) && !isPublicAddress(url.hostname.replace(/^\[|\]$/g, ""))) {
      throw new SafeFetchError("Blocked non-public address");
    }

    const res = await new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }>((resolve, reject) => {
      const mod = url.protocol === "https:" ? https : http;
      const req = mod.request(
        url,
        { method: "GET", lookup: guardedLookup, timeout: timeoutMs, headers: { "User-Agent": userAgent, Accept: accept } },
        (r) => {
          const chunks: Buffer[] = [];
          let size = 0;
          r.on("data", (c: Buffer) => {
            size += c.length;
            if (size > maxBytes) {
              req.destroy(new SafeFetchError(`Response larger than ${maxBytes} bytes`));
              return;
            }
            chunks.push(c);
          });
          r.on("end", () => resolve({ status: r.statusCode ?? 0, headers: r.headers, body: Buffer.concat(chunks) }));
          r.on("error", reject);
        },
      );
      req.on("timeout", () => req.destroy(new SafeFetchError("Request timed out")));
      req.on("error", reject);
      req.end();
    });

    if (res.status >= 300 && res.status < 400 && res.headers.location) {
      url = new URL(res.headers.location, url);
      continue;
    }
    return { url: url.toString(), status: res.status, contentType: String(res.headers["content-type"] ?? ""), body: res.body };
  }
  throw new SafeFetchError("Too many redirects");
}
