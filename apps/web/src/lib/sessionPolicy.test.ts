import { describe, expect, it } from "vitest";
import { canRemember, idleLimitMs, REMEMBER_MAX_AGE_MS, sessionEnd } from "./sessionPolicy";

const MIN = 60_000;
const now = 1_800_000_000_000;

describe("session policy", () => {
  it("signs patients out after 30 idle minutes and staff after 15", () => {
    expect(sessionEnd({ role: "PATIENT", authAt: now - 40 * MIN, lastSeen: now - 29 * MIN }, now)).toBeNull();
    expect(sessionEnd({ role: "PATIENT", authAt: now - 40 * MIN, lastSeen: now - 31 * MIN }, now)).toBe("idle");
    expect(sessionEnd({ role: "PROVIDER", authAt: now - 20 * MIN, lastSeen: now - 16 * MIN }, now)).toBe("idle");
    expect(sessionEnd({ role: "ADMIN", authAt: now - 20 * MIN, lastSeen: now - 14 * MIN }, now)).toBeNull();
  });

  it("caps an active session at 12 hours unless kept signed in", () => {
    expect(sessionEnd({ role: "PATIENT", authAt: now - 13 * 60 * MIN, lastSeen: now }, now)).toBe("expired");
    expect(sessionEnd({ role: "PATIENT", remember: true, authAt: now - 13 * 60 * MIN, lastSeen: now }, now)).toBeNull();
  });

  it("keep-me-signed-in lifts the idle limit for patients but still ends after 30 days", () => {
    const remembered = { role: "PATIENT" as const, remember: true };
    expect(
      sessionEnd({ ...remembered, authAt: now - 5 * 24 * 60 * MIN, lastSeen: now - 4 * 24 * 60 * MIN }, now),
    ).toBeNull();
    expect(sessionEnd({ ...remembered, authAt: now - REMEMBER_MAX_AGE_MS - 1, lastSeen: now }, now)).toBe("expired");
    expect(idleLimitMs("PATIENT", true)).toBeNull();
  });

  it("never lets staff stay signed in", () => {
    expect(canRemember("PROVIDER")).toBe(false);
    expect(canRemember("ADMIN")).toBe(false);
    expect(idleLimitMs("ADMIN", true)).toBe(15 * MIN);
    expect(
      sessionEnd({ role: "PROVIDER", remember: true, authAt: now - 20 * MIN, lastSeen: now - 16 * MIN }, now),
    ).toBe("idle");
  });

  it("does not end sessions that carry no clock yet (issued before this policy)", () => {
    expect(sessionEnd({ role: "PATIENT" }, now)).toBeNull();
  });
});
