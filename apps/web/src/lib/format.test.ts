import { afterEach, describe, expect, it, vi } from "vitest";
import { doctorName, formatDate, formatRelative } from "./format";

describe("format", () => {
  afterEach(() => vi.useRealTimers());

  it("formats dates day-first (en-GB)", () => {
    expect(formatDate("2026-10-17T12:00:00Z")).toBe("17 Oct 2026");
    expect(formatDate("2026-10-17T12:00:00Z", "long")).toBe("17 October 2026");
  });

  it("formats relative times", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-17T12:00:00Z"));
    expect(formatRelative("2026-10-17T11:59:40Z")).toBe("now");
    expect(formatRelative("2026-10-17T11:55:00Z", true)).toBe("5m ago");
    expect(formatRelative("2026-10-17T09:00:00Z")).toBe("3h");
    expect(formatRelative("2026-10-15T12:00:00Z")).toBe("2d");
    expect(formatRelative("2026-10-17T11:59:59Z", true)).toBe("just now");
  });

  it("titles doctors exactly once", () => {
    expect(doctorName("Claudine Mukamana")).toBe("Dr. Claudine Mukamana");
    expect(doctorName(" Dr. Claudine ")).toBe("Dr. Claudine");
    expect(doctorName("dr Eric")).toBe("dr Eric");
  });
});
