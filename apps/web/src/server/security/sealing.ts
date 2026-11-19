import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes } from "crypto";

// One place for application-level encryption and opaque tokens.
//
// Keys are derived per purpose (HKDF "info" label) from DATA_ENCRYPTION_KEY,
// falling back to NEXTAUTH_SECRET, so a key for one feature can never decrypt
// another feature's data. AES-256-GCM provides secrecy and tamper detection.

const SEAL_VERSION = 1;

function rootSecret(): string {
  const secret = process.env.DATA_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("DATA_ENCRYPTION_KEY (or NEXTAUTH_SECRET) must be set to encrypt data");
  return secret;
}

function keyFor(purpose: string): Buffer {
  return Buffer.from(hkdfSync("sha256", rootSecret(), "nauricare-sealing", `nauricare:${purpose}:v${SEAL_VERSION}`, 32));
}

/** Encrypts a JSON value for `purpose`. Output is URL-safe base64. */
export function sealJson(purpose: string, value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFor(purpose), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

/** Decrypts a value sealed for `purpose`; null if malformed, tampered or for another purpose. */
export function openJson<T>(purpose: string, sealed: string): T | null {
  try {
    const raw = Buffer.from(sealed, "base64url");
    if (raw.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", keyFor(purpose), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const json = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/** 256-bit random token for links; store only `hashToken(token)` server-side. */
export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Keyed hash (HMAC-SHA256) for `purpose`; use for short secrets like OTP codes. */
export function keyedHash(purpose: string, value: string): string {
  return createHmac("sha256", keyFor(`hmac:${purpose}`)).update(value).digest("base64url");
}
