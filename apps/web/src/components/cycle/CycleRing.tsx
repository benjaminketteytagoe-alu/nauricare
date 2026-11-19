import type { PhaseId } from "@/lib/cycle/catalog";

// Flo-style cycle ring: one segment per day of the cycle. Period days are
// rose, the fertile window teal, ovulation dark teal; a marker shows today.

const SIZE = 260;
const C = SIZE / 2;
const R = 112;
const STROKE = 16;

function polar(deg: number, r = R) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: C + r * Math.cos(rad), y: C + r * Math.sin(rad) };
}

function arc(startDeg: number, endDeg: number) {
  const a = polar(startDeg);
  const b = polar(endDeg);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${R} ${R} 0 ${endDeg - startDeg > 180 ? 1 : 0} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

export function CycleRing({
  cycleDay,
  cycleLength,
  periodLength,
  headline,
  subline,
  phase,
}: {
  cycleDay: number | null;
  cycleLength: number;
  periodLength: number;
  headline: string;
  subline: string;
  phase: PhaseId | null;
}) {
  const ovulation = cycleLength - 14;
  const step = 360 / cycleLength;
  const gap = Math.min(1.6, step * 0.25);
  const colorFor = (day: number) =>
    day <= periodLength ? "#F43F5E" : day === ovulation ? "#0F766E" : day >= ovulation - 5 && day <= ovulation + 1 ? "#5EEAD4" : "#E2E8F0";
  const marker = cycleDay && cycleDay <= cycleLength ? polar((cycleDay - 0.5) * step) : null;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[260px]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" role="img" aria-label={`${headline}. ${subline}`}>
        {Array.from({ length: cycleLength }, (_, i) => (
          <path key={i} d={arc(i * step + gap / 2, (i + 1) * step - gap / 2)} stroke={colorFor(i + 1)} strokeWidth={STROKE} fill="none" strokeLinecap="butt" />
        ))}
        {marker && (
          <g>
            <circle cx={marker.x} cy={marker.y} r={14} fill="#fff" stroke="#0F172A" strokeWidth={3} />
            <circle cx={marker.x} cy={marker.y} r={5} fill="#0F172A" />
          </g>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-12 text-center">
        {phase && <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{cycleDay ? `Cycle day ${cycleDay}` : ""}</p>}
        <p className="mt-1 text-2xl font-extrabold leading-tight text-nc-ink">{headline}</p>
        <p className="mt-1 text-sm text-slate-600">{subline}</p>
      </div>
    </div>
  );
}
