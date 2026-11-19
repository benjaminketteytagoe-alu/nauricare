import type { ReactNode } from "react";

// Shared pill for statuses, severities and categories so colour meaning is
// consistent everywhere: cobalt = calm/active, amber = attention, berry =
// critical, slate = neutral/closed.

export type ChipTone = "primary" | "amber" | "berry" | "neutral" | "muted" | "success";

const TONES: Record<ChipTone, string> = {
  primary: "bg-nc-primary-container text-nc-primary border-blue-200",
  amber: "bg-nc-amber-container text-nc-amber border-amber-200",
  berry: "bg-nc-berry-container text-nc-berry border-rose-200",
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  muted: "bg-slate-50 text-slate-500 border-slate-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function StatusChip({ tone, children, className = "" }: { tone: ChipTone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

export const SEVERITY_TONE: Record<string, ChipTone> = { LOW: "primary", MODERATE: "amber", URGENT: "berry" };
export const SEVERITY_TEXT: Record<string, string> = { LOW: "text-nc-primary", MODERATE: "text-nc-amber", URGENT: "text-nc-berry" };

export const REFERRAL_STATUS_TONE: Record<string, ChipTone> = {
  PENDING: "amber",
  ACCEPTED: "primary",
  COMPLETED: "neutral",
  EXPIRED: "muted",
};
