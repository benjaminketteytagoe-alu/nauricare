import type { ReactNode } from "react";
import { sparkGeometry, sparkSummary } from "@/lib/charts/sparkline";
import { cn } from "@/lib/utils";

// Data display primitives for tracking and briefs: Stat, Sparkline, Timeline.
// Numbers use tabular figures so columns of values line up.

export type Trend = "up" | "down" | "flat";

export function Stat({
  label,
  value,
  unit,
  hint,
  trend,
  trendLabel,
  chart,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  /** Short context under the value, e.g. "Last 6 cycles". */
  hint?: ReactNode;
  trend?: Trend;
  /** Required with `trend`: the words that carry the meaning, e.g. "2 days shorter". */
  trendLabel?: string;
  chart?: ReactNode;
  className?: string;
}) {
  const arrow = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  return (
    <div className={cn("rounded-card border border-hairline bg-surface p-5 shadow-card", className)}>
      <p className="text-sm font-medium text-ink-muted">{label}</p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="nums-clinical font-display text-display-md text-ink">{value}</span>
        {unit && <span className="text-sm text-ink-muted">{unit}</span>}
      </p>
      {trend && trendLabel && (
        <p className="mt-1 text-sm text-ink-soft">
          <span aria-hidden className="mr-1">
            {arrow}
          </span>
          {trendLabel}
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      {chart && <div className="mt-4">{chart}</div>}
    </div>
  );
}

/** Small trend line. `band` shades a reference range (e.g. a lab's normal range). */
export function Sparkline({
  values,
  width = 160,
  height = 40,
  band,
  unit,
  label,
  className,
}: {
  values: readonly number[];
  width?: number;
  height?: number;
  band?: [number, number];
  unit?: string;
  /** What is plotted, prefixed to the generated summary. */
  label?: string;
  className?: string;
}) {
  const g = sparkGeometry(values, { width, height, pad: 3, band });
  const last = g.points[g.points.length - 1];
  const summary = `${label ? `${label}: ` : ""}${sparkSummary(values, unit)}`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={summary}
      className={cn("overflow-visible text-brand", className)}
    >
      {g.band && <rect x={0} y={g.band.y} width={width} height={g.band.height} rx={4} className="fill-success-soft" />}
      {g.area && <path d={g.area} className="fill-current opacity-10" />}
      {g.line && (
        <path
          d={g.line}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {last && <circle cx={last.x} cy={last.y} r={3} className="fill-current stroke-surface" strokeWidth={1.5} />}
    </svg>
  );
}

export interface TimelineItem {
  id: string;
  /** Machine-readable date for <time dateTime>. */
  at: string;
  /** Human date, already formatted (lib/format). */
  when: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  tone?: "brand" | "info" | "success" | "warning" | "danger" | "neutral";
}

const DOT: Record<NonNullable<TimelineItem["tone"]>, string> = {
  brand: "bg-brand",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-field",
};

/** Vertical, newest-first list of dated events. */
export function Timeline({ items, className }: { items: readonly TimelineItem[]; className?: string }) {
  return (
    <ol className={cn("relative", className)}>
      {items.map((item, i) => (
        <li key={item.id} className="relative grid grid-cols-[1.25rem_1fr] gap-x-3 pb-6 last:pb-0">
          {i < items.length - 1 && (
            <span aria-hidden className="absolute top-4 bottom-0 left-[0.55rem] w-px bg-hairline" />
          )}
          <span
            aria-hidden
            className={cn("relative mt-1.5 size-2.5 justify-self-center rounded-full", DOT[item.tone ?? "brand"])}
          />
          <div className="min-w-0">
            <time dateTime={item.at} className="nums-clinical text-xs font-medium text-ink-muted">
              {item.when}
            </time>
            <p className="mt-0.5 font-medium text-ink">{item.title}</p>
            {item.body && <div className="mt-1 text-sm text-ink-soft">{item.body}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}
