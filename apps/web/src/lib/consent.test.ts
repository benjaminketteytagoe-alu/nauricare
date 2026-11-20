import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const { evaluateConsent, CURRENT_CONSENT_VERSION } = await import("./consent");

const granted = {
  hasConsentedToPrivacy: true,
  hasConsentedToTriage: true,
  consentTimestamp: new Date("2026-10-01T09:00:00Z"),
  consentVersion: CURRENT_CONSENT_VERSION,
};

describe("evaluateConsent", () => {
  it("is valid only with both flags, a timestamp and the current version", () => {
    expect(evaluateConsent(granted)).toEqual({
      valid: true,
      grantedAt: granted.consentTimestamp,
      version: CURRENT_CONSENT_VERSION,
    });
  });

  it.each([
    ["no user", null],
    ["privacy not granted", { ...granted, hasConsentedToPrivacy: false }],
    ["triage not granted", { ...granted, hasConsentedToTriage: false }],
    ["no timestamp", { ...granted, consentTimestamp: null }],
    ["outdated notice version", { ...granted, consentVersion: "0.0-old" }],
  ])("is invalid with %s", (_label, input) => {
    expect(evaluateConsent(input)).toEqual({ valid: false, grantedAt: null, version: null });
  });
});
