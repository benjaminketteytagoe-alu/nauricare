import type { Role } from "@prisma/client";

// When a signed-in session ends. Pure, so the proxy, the NextAuth callbacks
// and the browser's idle guard all apply the same rules.
//
// - Inactivity: patients are signed out after 30 idle minutes, staff after 15.
//   "Activity" is the browser reporting real input (see IdleGuard); merely
//   having a tab open does not count.
// - "Keep me signed in" (patients only, chosen when entering the sign-in code)
//   lifts the inactivity limit, but the session still ends after 30 days and,
//   like every session, the moment the account's password changes.
// - Without it, a session lasts at most 12 hours however active it is.

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

const IDLE_LIMIT_MS: Record<Role, number> = { PATIENT: 30 * MIN, PROVIDER: 15 * MIN, ADMIN: 15 * MIN };
export const REMEMBER_MAX_AGE_MS = 30 * DAY;
const SESSION_MAX_AGE_MS = 12 * 60 * MIN;
/** The browser reports activity at most this often. */
export const ACTIVITY_REPORT_MS = MIN;
/** The "still there?" warning appears this long before an idle sign-out. */
export const IDLE_WARNING_MS = 2 * MIN;

export type SessionEnd = "idle" | "expired" | "revoked";

export const canRemember = (role: Role | undefined) => role === "PATIENT";

/** The idle limit for this session, or null when it was kept signed in. */
export function idleLimitMs(role: Role, remember: boolean | undefined): number | null {
  return remember && canRemember(role) ? null : (IDLE_LIMIT_MS[role] ?? 15 * MIN);
}

export interface SessionClock {
  role: Role;
  remember?: boolean;
  authAt?: number; // when the sign-in code was accepted
  lastSeen?: number; // last activity the browser reported
}

/** Why this session is over at `now`, or null while it is still valid. */
export function sessionEnd(s: SessionClock, now = Date.now()): SessionEnd | null {
  const remembered = !!s.remember && canRemember(s.role);
  if (s.authAt && now - s.authAt > (remembered ? REMEMBER_MAX_AGE_MS : SESSION_MAX_AGE_MS)) return "expired";
  const idle = idleLimitMs(s.role, s.remember);
  if (idle !== null && s.lastSeen && now - s.lastSeen > idle) return "idle";
  return null;
}

export const SESSION_END_MESSAGE: Record<SessionEnd, string> = {
  idle: "You were signed out after a period of inactivity, to keep your health information private.",
  expired: "Your session has expired. Please sign in again.",
  revoked: "Your password was changed, so you were signed out on this device.",
};
