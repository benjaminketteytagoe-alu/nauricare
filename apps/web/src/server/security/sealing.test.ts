import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashToken, keyedHash, openJson, randomToken, sealJson } from "./sealing";

describe("sealing", () => {
  beforeEach(() => vi.stubEnv("DATA_ENCRYPTION_KEY", "unit-test-only:".padEnd(48, "a")));
  afterEach(() => vi.unstubAllEnvs());

  it("round-trips JSON for the same purpose", () => {
    const sealed = sealJson("referral-share", { id: "r1", n: [1, 2] });
    expect(sealed).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(openJson("referral-share", sealed)).toEqual({ id: "r1", n: [1, 2] });
  });

  it("uses a fresh IV every time", () => {
    expect(sealJson("p", { a: 1 })).not.toBe(sealJson("p", { a: 1 }));
  });

  it("refuses another purpose's data", () => {
    expect(openJson("other-purpose", sealJson("referral-share", { id: "r1" }))).toBeNull();
  });

  it("detects tampering and malformed input", () => {
    const raw = Buffer.from(sealJson("p", { severity: "LOW" }), "base64url");
    raw[raw.length - 1] ^= 1;
    expect(openJson("p", raw.toString("base64url"))).toBeNull();
    expect(openJson("p", "short")).toBeNull();
    expect(openJson("p", "!!!not base64!!!")).toBeNull();
  });

  it("cannot open data sealed under a different key", () => {
    const sealed = sealJson("p", { a: 1 });
    vi.stubEnv("DATA_ENCRYPTION_KEY", "unit-test-only:".padEnd(48, "b"));
    expect(openJson("p", sealed)).toBeNull();
  });

  it("falls back to NEXTAUTH_SECRET and fails loudly with neither", () => {
    vi.stubEnv("DATA_ENCRYPTION_KEY", "");
    vi.stubEnv("NEXTAUTH_SECRET", "nextauth-secret-for-tests-0123456789");
    expect(openJson("p", sealJson("p", 1))).toBe(1);
    vi.stubEnv("NEXTAUTH_SECRET", "");
    expect(() => sealJson("p", 1)).toThrow(/must be set/);
  });

  it("makes random tokens and stable, purpose-bound hashes", () => {
    expect(randomToken()).toHaveLength(43);
    expect(randomToken()).not.toBe(randomToken());
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).toMatch(/^[0-9a-f]{64}$/);
    expect(keyedHash("otp", "123456")).toBe(keyedHash("otp", "123456"));
    expect(keyedHash("otp", "123456")).not.toBe(keyedHash("other", "123456"));
  });
});
