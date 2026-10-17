// Browser-side storage for the landing-page (guest) Nauri triage. Client only.
//
// - Guest consent lives in localStorage, tagged with the notice version.
// - The readable triage summary lives in sessionStorage (cleared with the tab).
// - Only the opaque, encrypted claim token is copied to localStorage, so the
//   hand-over still works when the visitor verifies their email in a new tab.
//   It reveals nothing if read, and it expires server-side after two hours.

import type { TriageOutcome, TriageResult } from "@/lib/triage/engine";

const CONSENT_KEY = "nauricare_guest_triage_consent";
const PENDING_KEY = "nauricare_pending_triage";
const TOKEN_KEY = "nauricare_pending_triage_token";

export type HandoverAction = "referral" | "save";

export interface PendingTriage {
  symptoms: string[];
  triageOutcome: TriageOutcome;
  recommendedSpecialty: string;
  severity: TriageResult["severity"];
  clinicalSummary: string;
  claimToken: string;
  expiresAt: number;
  action: HandoverAction;
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback; // storage blocked or JSON corrupt
  }
}

export function hasGuestConsent(version: string): boolean {
  return safe(() => JSON.parse(localStorage.getItem(CONSENT_KEY) ?? "null")?.version === version, false);
}

export function saveGuestConsent(version: string): void {
  safe(() => localStorage.setItem(CONSENT_KEY, JSON.stringify({ version, at: new Date().toISOString() })), undefined);
}

export function savePendingTriage(p: PendingTriage): void {
  safe(() => sessionStorage.setItem(PENDING_KEY, JSON.stringify(p)), undefined);
  safe(() => localStorage.setItem(TOKEN_KEY, JSON.stringify({ t: p.claimToken, exp: p.expiresAt, action: p.action })), undefined);
}

export function readPendingTriage(): PendingTriage | null {
  const p = safe<PendingTriage | null>(() => JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? "null"), null);
  return p && p.expiresAt > Date.now() ? p : null;
}

/** The claim token from this tab, or from another tab (email verification). */
export function readPendingClaim(): { token: string; action: HandoverAction } | null {
  const p = readPendingTriage();
  if (p) return { token: p.claimToken, action: p.action };
  const stored = safe<{ t: string; exp: number; action?: HandoverAction } | null>(
    () => JSON.parse(localStorage.getItem(TOKEN_KEY) ?? "null"),
    null,
  );
  if (!stored || stored.exp < Date.now()) {
    clearPendingTriage();
    return null;
  }
  return { token: stored.t, action: stored.action ?? "referral" };
}

export function clearPendingTriage(): void {
  safe(() => sessionStorage.removeItem(PENDING_KEY), undefined);
  safe(() => localStorage.removeItem(TOKEN_KEY), undefined);
}
