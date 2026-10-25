// Wall-clock parts of an instant in a given IANA time zone, without a
// date library. Used by reminders, which fire at the patient's local hour.

export interface ZonedParts {
  dateKey: string; // YYYY-MM-DD in that zone
  hour: number; // 0-23
  weekday: number; // 0 = Sunday
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function zonedParts(at: Date, timeZone: string): ZonedParts {
  const tz = isValidTimeZone(timeZone) ? timeZone : "Africa/Kigali";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short" })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    weekday: WEEKDAYS.indexOf(parts.weekday),
  };
}

/** "Tue 4 Nov, 14:30" in the given zone. */
export function formatInZone(at: Date, timeZone: string): string {
  const tz = isValidTimeZone(timeZone) ? timeZone : "Africa/Kigali";
  return at.toLocaleString("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
