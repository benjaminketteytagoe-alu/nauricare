import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Shared pill for statuses, severities and categories so colour meaning is
// consistent everywhere: info (cobalt) = calm/active, warning (apricot) =
// attention, danger = critical, neutral = closed. Text always carries the
// meaning too; colour is never the only signal.

export type ChipTone = "primary" | "amber" | "berry" | "neutral" | "muted" | "success" | "brand" | "lavender";

const TONES: Record<ChipTone, string> = {
  primary: "bg-info-soft text-info border-info-line",
  amber: "bg-warning-soft text-warning border-warning-line",
  berry: "bg-danger-soft text-danger border-danger-line",
  neutral: "bg-surface-muted text-ink-soft border-hairline",
  muted: "bg-canvas text-ink-muted border-hairline",
  success: "bg-success-soft text-success border-success-line",
  brand: "bg-brand-soft text-brand-ink border-brand-line",
  lavender: "bg-lavender-soft text-lavender border-lavender-line",
};

export function StatusChip({
  tone,
  children,
  className = "",
}: {
  tone: ChipTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const SEVERITY_TONE: Record<string, ChipTone> = { LOW: "primary", MODERATE: "amber", URGENT: "berry" };
export const SEVERITY_TEXT: Record<string, string> = {
  LOW: "text-info",
  MODERATE: "text-warning",
  URGENT: "text-danger",
};

export const REFERRAL_STATUS_TONE: Record<string, ChipTone> = {
  PENDING: "amber",
  ACCEPTED: "primary",
  COMPLETED: "neutral",
  EXPIRED: "muted",
};
