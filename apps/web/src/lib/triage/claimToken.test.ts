import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sealJson } from "@/server/security/sealing";
import { openGuestTriage, sealGuestTriage } from "./claimToken";
import type { TriageResult } from "./engine";

const triage: TriageResult = {
  severity: "MODERATE",
  summary: "See a clinician.",
  recommendedSpecialty: "General Practitioner",
  redFlags: [],
  selfCare: [],
  seekCareWithin: "Within 3 days",
  engine: "rules",
};

describe("guest triage claim token", () => {
  beforeEach(() => vi.stubEnv("DATA_ENCRYPTION_KEY", "unit-test-only:".padEnd(48, "d")));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("round-trips the guest's result", () => {
    const { token, expiresAt } = sealGuestTriage({ symptoms: ["cramps"], notes: "", triage, consentVersion: "v1" });
    const payload = openGuestTriage(token);
    expect(payload?.triage.severity).toBe("MODERATE");
    expect(payload?.exp).toBe(expiresAt);
  });

  it("expires after two hours", () => {
    vi.useFakeTimers();
    const { token } = sealGuestTriage({ symptoms: [], notes: "", triage, consentVersion: "v1" });
    vi.advanceTimersByTime(2 * 60 * 60_000 + 1);
    expect(openGuestTriage(token)).toBeNull();
  });

  it("rejects tokens sealed for another purpose or with the wrong shape", () => {
    expect(openGuestTriage(sealJson("referral-share", { v: 1, exp: Date.now() + 1e6 }))).toBeNull();
    expect(openGuestTriage(sealJson("guest-triage-claim", { v: 2, exp: Date.now() + 1e6 }))).toBeNull();
    expect(openGuestTriage("garbage")).toBeNull();
  });
});
