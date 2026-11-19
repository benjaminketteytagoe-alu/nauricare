import { randomUUID } from "crypto";
import { openJson, sealJson } from "@/server/security/sealing";
import type { TriageResult } from "./engine";

// A guest's triage result travels to their new account as an opaque token.
// AES-256-GCM (shared sealing helper) gives both secrecy (anyone reading
// browser storage on a shared device sees nothing) and integrity (severity
// cannot be edited before claim).

const TTL_MS = 2 * 60 * 60_000; // two hours: long enough to sign up and verify email
const PURPOSE = "guest-triage-claim";

export interface GuestTriagePayload {
  v: 1;
  jti: string;
  exp: number;
  symptoms: string[];
  notes: string;
  triage: TriageResult;
  consentVersion: string;
}

export function sealGuestTriage(data: Omit<GuestTriagePayload, "v" | "jti" | "exp">): { token: string; expiresAt: number } {
  const payload: GuestTriagePayload = { v: 1, jti: randomUUID(), exp: Date.now() + TTL_MS, ...data };
  const token = sealJson(PURPOSE, payload);
  return { token, expiresAt: payload.exp };
}

/** Returns the payload, or null when the token is malformed, tampered with or expired. */
export function openGuestTriage(token: string): GuestTriagePayload | null {
  const payload = openJson<GuestTriagePayload>(PURPOSE, token);
  if (!payload || payload.v !== 1 || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
  return payload;
}
