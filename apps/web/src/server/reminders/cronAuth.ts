import { createHash, timingSafeEqual } from "crypto";

// Shared-secret check for scheduled triggers (AWS EventBridge).
// Accepts "Authorization: <secret>" (EventBridge API-key connection) or
// "Authorization: Bearer <secret>". CRON_SECRET_PREVIOUS is also accepted so
// the secret can be rotated without missing a run. Secrets must be 32+ chars.

const digest = (v: string) => createHash("sha256").update(v).digest(); // equal-length buffers for timingSafeEqual

export function cronConfigured(): boolean {
  return (process.env.CRON_SECRET ?? "").length >= 32;
}

export function isAuthorizedCron(authorization: string | null): boolean {
  if (!authorization || !cronConfigured()) return false;
  const presented = authorization.startsWith("Bearer ") ? authorization.slice(7) : authorization;
  const given = digest(presented);
  const secrets = [process.env.CRON_SECRET, process.env.CRON_SECRET_PREVIOUS].filter((s): s is string => !!s && s.length >= 32);
  let ok = false;
  for (const s of secrets) ok = timingSafeEqual(given, digest(s)) || ok; // check all, no early exit
  return ok;
}
