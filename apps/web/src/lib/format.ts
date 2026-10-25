// Shared display formatters so every screen shows dates the same way.
// en-GB gives "17 Oct 2026", the day-first order used in Rwanda.

type DateInput = Date | string | number;

const toDate = (d: DateInput) => (d instanceof Date ? d : new Date(d));

export function formatDate(d: DateInput, style: "short" | "long" = "short"): string {
  return toDate(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: "numeric",
  });
}

export function formatTime(d: DateInput): string {
  return toDate(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(d: DateInput): string {
  return `${formatDate(d)}, ${formatTime(d)}`;
}

/** "now", "5m", "3h", "2d" (or with `suffix`: "5m ago"). */
export function formatRelative(d: DateInput, suffix = false): string {
  const diff = Date.now() - toDate(d).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return suffix ? "just now" : "now";
  const unit = m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`;
  return suffix ? `${unit} ago` : unit;
}

/** "Claudine Mukamana" → "Dr. Claudine Mukamana"; leaves names already titled alone. */
export function doctorName(name: string): string {
  return /^dr\.?\s/i.test(name.trim()) ? name.trim() : `Dr. ${name.trim()}`;
}
