import { addDays, diffInDays } from "@/lib/cycleDates";

// Cycle prediction shared by the cycle tracker, the dashboard and the
// reminder sweep, so every surface shows the same "next period" date.

export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_LENGTH = 5;
const PLAUSIBLE_CYCLE = { min: 15, max: 60 }; // ignore gaps from missed logs

export interface PeriodLog {
  startDate: Date;
  endDate: Date | null;
}

export interface CyclePredictionDates {
  nextStart: Date;
  nextEnd: Date;
  ovulationDay: Date;
  fertileStart: Date;
  fertileEnd: Date;
}

export interface CycleStats {
  cycleLength: number;
  periodLength: number;
  prediction: CyclePredictionDates | null;
}

/**
 * Averages and the next predicted period. `fallbackCycleLength` (the length
 * the patient set in Settings) is used until two logged periods give a real
 * average. Gaps outside 15–60 days are treated as missed logs and ignored.
 */
export function predictCycle(logs: PeriodLog[], fallbackCycleLength?: number | null): CycleStats {
  const fallback = fallbackCycleLength && fallbackCycleLength >= PLAUSIBLE_CYCLE.min && fallbackCycleLength <= PLAUSIBLE_CYCLE.max
    ? Math.round(fallbackCycleLength)
    : DEFAULT_CYCLE_LENGTH;
  const ascending = [...logs].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  const gaps: number[] = [];
  for (let i = 1; i < ascending.length; i++) {
    const gap = diffInDays(ascending[i].startDate, ascending[i - 1].startDate);
    if (gap >= PLAUSIBLE_CYCLE.min && gap <= PLAUSIBLE_CYCLE.max) gaps.push(gap);
  }
  const recent = gaps.slice(-6); // the last six cycles reflect the current pattern best
  const cycleLength = recent.length ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length) : fallback;

  const durations = ascending.filter((l) => l.endDate).map((l) => diffInDays(l.endDate as Date, l.startDate) + 1).filter((d) => d > 0 && d <= 14);
  const periodLength = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : DEFAULT_PERIOD_LENGTH;

  const last = ascending.at(-1);
  if (!last) return { cycleLength, periodLength, prediction: null };

  const nextStart = addDays(last.startDate, cycleLength);
  const ovulationDay = addDays(nextStart, -14);
  return {
    cycleLength,
    periodLength,
    prediction: {
      nextStart,
      nextEnd: addDays(nextStart, periodLength - 1),
      ovulationDay,
      fertileStart: addDays(ovulationDay, -5),
      fertileEnd: addDays(ovulationDay, 1),
    },
  };
}
