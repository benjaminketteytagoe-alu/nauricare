import { describe, expect, it } from "vitest";
import { parseDateKey, toDateKey } from "@/lib/cycleDates";
import { DEFAULT_CYCLE_LENGTH, DEFAULT_PERIOD_LENGTH, predictCycle } from "./predict";

const d = parseDateKey;
const log = (start: string, end: string | null = null) => ({ startDate: d(start), endDate: end ? d(end) : null });

describe("predictCycle", () => {
  it("returns defaults and no prediction without logs", () => {
    expect(predictCycle([])).toEqual({
      cycleLength: DEFAULT_CYCLE_LENGTH,
      periodLength: DEFAULT_PERIOD_LENGTH,
      prediction: null,
    });
  });

  it("uses the patient's own cycle length until two periods are logged", () => {
    const r = predictCycle([log("2026-10-01")], 32);
    expect(r.cycleLength).toBe(32);
    expect(toDateKey(r.prediction!.nextStart)).toBe("2026-11-02");
  });

  it("ignores an implausible fallback length", () => {
    expect(predictCycle([log("2026-10-01")], 5).cycleLength).toBe(DEFAULT_CYCLE_LENGTH);
    expect(predictCycle([log("2026-10-01")], 120).cycleLength).toBe(DEFAULT_CYCLE_LENGTH);
  });

  it("averages logged gaps regardless of input order", () => {
    const r = predictCycle([log("2026-09-30"), log("2026-08-01"), log("2026-08-31")]);
    expect(r.cycleLength).toBe(30); // gaps 30 and 30
    expect(toDateKey(r.prediction!.nextStart)).toBe("2026-10-30");
  });

  it("treats gaps outside 15-60 days as missed logs", () => {
    const r = predictCycle([log("2026-01-01"), log("2026-01-29"), log("2026-06-01"), log("2026-06-29")]);
    expect(r.cycleLength).toBe(28); // the 123-day gap is ignored
  });

  it("only uses the last six cycles", () => {
    const starts = [
      "2026-01-01",
      "2026-02-10",
      "2026-03-10",
      "2026-04-07",
      "2026-05-05",
      "2026-06-02",
      "2026-06-30",
      "2026-07-28",
    ];
    // first gap is 40 days, the remaining six are 28: the 40 falls out of the window
    expect(predictCycle(starts.map((s) => log(s))).cycleLength).toBe(28);
  });

  it("derives period length, fertile window and ovulation", () => {
    const r = predictCycle([log("2026-09-01", "2026-09-04"), log("2026-09-29", "2026-10-02")]);
    expect(r.periodLength).toBe(4);
    const p = r.prediction!;
    expect(toDateKey(p.nextStart)).toBe("2026-10-27");
    expect(toDateKey(p.nextEnd)).toBe("2026-10-30");
    expect(toDateKey(p.ovulationDay)).toBe("2026-10-13");
    expect(toDateKey(p.fertileStart)).toBe("2026-10-08");
    expect(toDateKey(p.fertileEnd)).toBe("2026-10-14");
  });

  it("ignores implausible period durations", () => {
    expect(predictCycle([log("2026-09-01", "2026-09-30")]).periodLength).toBe(DEFAULT_PERIOD_LENGTH);
  });
});
