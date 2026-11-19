/**
 * Extracts the real client IP when the app runs behind a Cloudflare proxy.
 * Priority: CF-Connecting-IP > X-Forwarded-For (first hop) > x-real-ip > fallback.
 * Only trust these headers when the request is actually coming through Cloudflare
 * (verified at the infrastructure level, e.g. firewall allows only Cloudflare CIDRs).
 */
export function getClientIp(headers: Headers): string {
  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}
