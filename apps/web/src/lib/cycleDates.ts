// Date-only helpers shared by cycle tracking server actions and the calendar
// client component. All dates are treated as UTC midnight "YYYY-MM-DD" values
// so day-math never drifts across DST/timezone boundaries.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDateKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function diffInDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / MS_PER_DAY);
}
