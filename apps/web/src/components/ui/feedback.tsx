import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Loading and empty states.

/** Shimmering placeholder. Decorative: pair it with an aria-busy region. */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        "animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--nc-surface-muted)_0%,var(--nc-hairline)_50%,var(--nc-surface-muted)_100%)] bg-size-[200%_100%]",
        className,
      )}
      {...props}
    />
  );
}

/** A calm "nothing here yet" panel with one next step. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-card border border-dashed border-hairline bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      {Icon && (
        <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <p className="font-display text-display-sm text-ink">{title}</p>
      {description && <p className="mt-2 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
