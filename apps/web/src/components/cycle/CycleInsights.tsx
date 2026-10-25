import { BarChart3 } from "lucide-react";
import { MOOD_OPTIONS, SYMPTOM_OPTIONS } from "@/lib/cycle/catalog";
import type { CycleData } from "@/app/(patient)/dashboard/cycle/actions";

/** Averages, regularity, cycle history and the most-logged symptoms. */
export function CycleInsights({ data, todayKey }: { data: CycleData; todayKey: string }) {
  const lengths = data.logs.map((l) => l.cycleLength).filter((n): n is number => !!n && n >= 15 && n <= 60).slice(0, 6).reverse();
  const variation = lengths.length >= 2 ? Math.max(...lengths) - Math.min(...lengths) : null;
  const regularity = variation === null ? null : variation <= 7 ? "Regular" : variation <= 14 ? "Somewhat irregular" : "Irregular";

  const since = new Date(`${todayKey}T00:00:00Z`).getTime() - 30 * 86_400_000;
  const counts = new Map<string, number>();
  for (const d of data.dayLogs) {
    if (new Date(`${d.date}T00:00:00Z`).getTime() < since) continue;
    for (const s of [...d.symptoms, ...d.moods]) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  const labelOf = (id: string) => [...SYMPTOM_OPTIONS, ...MOOD_OPTIONS].find((o) => o.id === id);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxLen = Math.max(35, ...lengths);

  return (
    <section aria-labelledby="insights-heading" className="card-surface space-y-5 p-5 sm:p-6">
      <h2 id="insights-heading" className="flex items-center gap-2 text-lg font-bold text-nc-ink"><BarChart3 className="h-5 w-5 text-nc-primary" aria-hidden /> Your insights</h2>
      <dl className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-rose-50 p-3"><dt className="text-xs text-slate-600">Avg. cycle</dt><dd className="text-xl font-bold text-nc-ink">{data.averages.cycleLength}<span className="text-sm font-medium"> days</span></dd></div>
        <div className="rounded-2xl bg-rose-50 p-3"><dt className="text-xs text-slate-600">Avg. period</dt><dd className="text-xl font-bold text-nc-ink">{data.averages.periodLength}<span className="text-sm font-medium"> days</span></dd></div>
        <div className="rounded-2xl bg-rose-50 p-3"><dt className="text-xs text-slate-600">Regularity</dt><dd className="text-sm font-bold leading-7 text-nc-ink">{regularity ?? "—"}</dd></div>
      </dl>

      {lengths.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-nc-ink">Recent cycle lengths</h3>
          <ul className="space-y-1.5">
            {lengths.map((n, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="h-3 rounded-full bg-gradient-to-r from-rose-400 to-violet-400" style={{ width: `${(n / maxLen) * 100}%` }} aria-hidden />
                <span className="shrink-0 tabular-nums text-slate-700">{n} days</span>
              </li>
            ))}
          </ul>
          {regularity === "Irregular" && (
            <p className="mt-3 text-xs text-slate-600">Cycles that vary a lot can be linked to conditions such as PCOS. If this is new for you, consider discussing it with a specialist.</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Log two or more periods to see your cycle history and regularity.</p>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-nc-ink">Most logged in the last 30 days</h3>
        {top.length ? (
          <ul className="flex flex-wrap gap-2">
            {top.map(([id, n]) => (
              <li key={id} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">{labelOf(id)?.emoji} {labelOf(id)?.label ?? id} <span className="text-slate-500">×{n}</span></li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Nothing logged yet. Your daily logs will show patterns here.</p>
        )}
      </div>
    </section>
  );
}
