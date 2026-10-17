import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "crypto";
import type { TriageResult } from "./engine";

// A guest's triage result travels to their new account as an opaque token.
// AES-256-GCM gives both secrecy (anyone reading browser storage on a shared
// device sees nothing) and integrity (severity cannot be edited before claim).

const TTL_MS = 2 * 60 * 60_000; // two hours: long enough to sign up and verify email

export interface GuestTriagePayload {
  v: 1;
  jti: string;
  exp: number;
  symptoms: string[];
  notes: string;
  triage: TriageResult;
  consentVersion: string;
}

function key(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required to seal triage claim tokens");
  return createHash("sha256").update(`${secret}:nauricare-triage-claim:v1`).digest();
}

export function sealGuestTriage(data: Omit<GuestTriagePayload, "v" | "jti" | "exp">): { token: string; expiresAt: number } {
  const payload: GuestTriagePayload = { v: 1, jti: randomUUID(), exp: Date.now() + TTL_MS, ...data };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const token = Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
  return { token, expiresAt: payload.exp };
}

/** Returns the payload, or null when the token is malformed, tampered with or expired. */
export function openGuestTriage(token: string): GuestTriagePayload | null {
  try {
    const raw = Buffer.from(token, "base64url");
    if (raw.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const json = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
    const payload = JSON.parse(json) as GuestTriagePayload;
    if (payload.v !== 1 || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
