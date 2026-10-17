import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// One alert/callout primitive for every banner in the app (emergency notices,
// errors, warnings, info). Colours come from the NauriCare logo tokens.

export type CalloutTone = "info" | "warning" | "danger" | "success";

const TONES: Record<CalloutTone, string> = {
  info: "border-blue-200 bg-nc-primary-container text-nc-primary",
  warning: "border-amber-200 bg-nc-amber-container text-amber-800",
  danger: "border-rose-200 bg-nc-berry-container text-nc-berry",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
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
    <div role={role} className={`flex items-start gap-3 rounded-xl border p-4 text-sm leading-relaxed ${TONES[tone]} ${className}`}>
      {Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />}
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  );
}
