// Client-only: where to send a user right after they authenticate.
import { useClientValue } from "@/lib/hooks/useClientValue";
import { carryAuthParams, resolveAuthRedirect } from "@/lib/safeRedirect";
import { readPendingClaim } from "@/lib/triage/guestStorage";

export const ROLE_HOME_PATHS: Record<string, string> = { PATIENT: "/dashboard", PROVIDER: "/provider", ADMIN: "/admin" };
const HOME = ROLE_HOME_PATHS;

export function postAuthDestination(role?: string | null): string {
  const home = HOME[role ?? "PATIENT"] ?? "/dashboard";
  const requested = resolveAuthRedirect(window.location.search, window.location.origin);
  // Only follow a redirect into the user's own portal.
  if (requested && (requested === home || requested.startsWith(`${home}/`) || requested.startsWith(`${home}?`))) return requested;
  if ((role ?? "PATIENT") === "PATIENT") {
    const pending = readPendingClaim();
    if (pending) return `/dashboard/symptoms?action=${pending.action}`;
  }
  return home;
}

/** `?redirect=…&action=…` to carry between auth pages (empty during SSR/hydration). */
export function useAuthParams(): string {
  return useClientValue(() => carryAuthParams(window.location.search), "");
}
