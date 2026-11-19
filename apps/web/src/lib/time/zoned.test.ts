import { describe, expect, it } from "vitest";
import { formatInZone, isValidTimeZone, zonedParts } from "./zoned";

describe("zonedParts", () => {
  const at = new Date("2026-11-03T22:30:00Z"); // Tuesday 22:30 UTC

  it("reads the wall clock in the patient's zone", () => {
    expect(zonedParts(at, "Africa/Kigali")).toEqual({ dateKey: "2026-11-04", hour: 0, weekday: 3 });
    expect(zonedParts(at, "UTC")).toEqual({ dateKey: "2026-11-03", hour: 22, weekday: 2 });
  });

  it("falls back to Kigali for an unknown zone", () => {
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
    expect(zonedParts(at, "Mars/Olympus")).toEqual(zonedParts(at, "Africa/Kigali"));
    expect(formatInZone(at, "Mars/Olympus")).toBe(formatInZone(at, "Africa/Kigali"));
  });
});
