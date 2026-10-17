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
