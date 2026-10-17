// Open-redirect guard for ?redirect= / callbackUrl values. Only same-origin
// relative paths into the app are accepted; anything else (absolute URLs,
// protocol-relative "//evil.com", backslash tricks) falls back to `fallback`.

const ALLOWED_PREFIXES = ["/dashboard", "/provider", "/admin"];

export function safeRedirect(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  const path = value.split(/[?#]/)[0];
  if (!ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return fallback;
  return value;
}

/**
 * Resolves where to send a user after login/signup from the current query
 * string: `redirect` (+ optional `action`), or NextAuth's `callbackUrl`
 * (which may be an absolute same-origin URL). Returns null when none is valid.
 */
export function resolveAuthRedirect(search: string, origin: string): string | null {
  const params = new URLSearchParams(search);
  const redirect = params.get("redirect");
  if (redirect) {
    const action = params.get("action");
    const target = action && /^[a-z-]{1,20}$/.test(action) ? `${redirect}${redirect.includes("?") ? "&" : "?"}action=${action}` : redirect;
    const safe = safeRedirect(target, "");
    if (safe) return safe;
  }
  let callback = params.get("callbackUrl");
  if (callback?.startsWith(origin)) callback = callback.slice(origin.length) || "/";
  return safeRedirect(callback, "") || null;
}

/** Query string that carries redirect/action/callbackUrl between auth pages. */
export function carryAuthParams(search: string): string {
  const from = new URLSearchParams(search);
  const to = new URLSearchParams();
  for (const k of ["redirect", "action", "callbackUrl"]) {
    const v = from.get(k);
    if (v) to.set(k, v);
  }
  const s = to.toString();
  return s ? `?${s}` : "";
}
