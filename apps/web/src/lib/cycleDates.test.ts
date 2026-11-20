import { describe, expect, it } from "vitest";
import { addDays, diffInDays, localDateKey, parseDateKey, toDateKey } from "./cycleDates";

describe("cycleDates", () => {
  it("round-trips date keys at UTC midnight", () => {
    expect(parseDateKey("2026-03-29").toISOString()).toBe("2026-03-29T00:00:00.000Z");
    expect(toDateKey(parseDateKey("2026-03-29"))).toBe("2026-03-29");
  });

  it("does day maths across month and year boundaries", () => {
    expect(toDateKey(addDays(parseDateKey("2026-12-30"), 3))).toBe("2027-01-02");
    expect(diffInDays(parseDateKey("2027-01-02"), parseDateKey("2026-12-30"))).toBe(3);
    expect(diffInDays(parseDateKey("2026-01-01"), parseDateKey("2026-01-08"))).toBe(-7);
  });

  it("formats the local calendar date", () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});
