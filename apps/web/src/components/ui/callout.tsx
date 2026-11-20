import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// One alert/callout primitive for every banner in the app (emergency notices,
// errors, warnings, info). Info is the only place cobalt appears besides focus.

export type CalloutTone = "info" | "warning" | "danger" | "success" | "brand";

const TONES: Record<CalloutTone, string> = {
  info: "border-info-line bg-info-soft text-info",
  warning: "border-warning-line bg-warning-soft text-warning",
  danger: "border-danger-line bg-danger-soft text-danger",
  success: "border-success-line bg-success-soft text-success",
  brand: "border-brand-line bg-brand-soft text-brand-ink",
};

export function Callout({
  tone = "info",
  icon: Icon,
  title,
  children,
  className = "",
  role,
}: {
  tone?: CalloutTone;
  icon?: LucideIcon;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  role?: "alert" | "status";
}) {
  return (
    <div
      role={role}
      className={cn("flex items-start gap-3 rounded-field border p-4 text-sm leading-relaxed", TONES[tone], className)}
    >
      {Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />}
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  );
}
