import { Apple, Footprints, HeartHandshake } from "lucide-react";
import { PHASES, type PhaseId } from "@/lib/cycle/catalog";

/** Phase guidance with an illustration and everyday, locally familiar tips. */
export function PhaseCard({ phase }: { phase: PhaseId }) {
  const p = PHASES[phase];
  return (
    <section aria-labelledby="phase-heading" className="card-surface overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/illustrations/cycle/${phase}.svg`} alt="" className="aspect-[16/9] w-full object-cover" />
      <div className="space-y-4 p-5 sm:p-6">
        <div>
          <p className={`text-xs font-bold uppercase tracking-wider ${p.tone.text}`}>{p.name}</p>
          <h2 id="phase-heading" className="text-xl font-bold text-nc-ink">{p.tagline}</h2>
          <p className="mt-1 text-sm text-slate-600">{p.body}</p>
        </div>
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-nc-ink"><Apple className="h-4 w-4 text-emerald-600" aria-hidden /> Foods that help</h3>
          <ul className="mt-2 grid gap-1.5 text-sm text-slate-700 sm:grid-cols-2">
            {p.eat.map((e) => <li key={e} className={`rounded-xl px-3 py-2 ${p.tone.bg}`}>{e}</li>)}
          </ul>
        </div>
        <p className="flex items-start gap-2 text-sm text-slate-700"><Footprints className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden /> {p.move}</p>
        <p className="flex items-start gap-2 text-sm text-slate-700"><HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden /> {p.care}</p>
      </div>
    </section>
  );
}
