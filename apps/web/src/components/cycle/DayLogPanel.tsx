"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Droplet, Loader2 } from "lucide-react";
import type { FlowLevel } from "@prisma/client";
import { Callout } from "@/components/ui/callout";
import { FLOW_OPTIONS, MOOD_OPTIONS, SYMPTOM_OPTIONS } from "@/lib/cycle/catalog";
import { saveDayLog, type DayLogEntry } from "@/app/(patient)/dashboard/cycle/actions";

const chip = (on: boolean) =>
  `inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${on ? "border-nc-primary bg-nc-primary text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"}`;

/** Flo-style daily log: flow, symptoms, mood and a note for one day. Remount (key) per date. */
export function DayLogPanel({ date, label, initial }: { date: string; label: string; initial: DayLogEntry | null }) {
  const router = useRouter();
  const [flow, setFlow] = useState<FlowLevel | null>(initial?.flow ?? null);
  const [symptoms, setSymptoms] = useState<string[]>(initial?.symptoms ?? []);
  const [moods, setMoods] = useState<string[]>(initial?.moods ?? []);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const toggle = (list: string[], set: (v: string[]) => void, id: string) => {
    setSaved(false);
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  function save() {
    setError("");
    startTransition(async () => {
      const res = await saveDayLog({ date, flow, symptoms: symptoms as never, moods: moods as never, notes: notes.trim() || null });
      if (!res.success) return setError(res.error);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <section aria-labelledby="daylog-heading" className="card-surface space-y-5 p-5 sm:p-6">
      <div>
        <h2 id="daylog-heading" className="text-lg font-bold text-nc-ink">How are you, {label.toLowerCase() === "today" ? "today" : `on ${label}`}?</h2>
        <p className="text-sm text-slate-500">Tap everything that applies. Daily logs make your predictions and insights more accurate.</p>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-nc-ink">Flow</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {FLOW_OPTIONS.map((f) => (
            <button key={f.value} type="button" role="radio" aria-checked={flow === f.value} onClick={() => { setSaved(false); setFlow(flow === f.value ? null : f.value); }} className={chip(flow === f.value)}>
              {f.drops > 0 && <span className="flex" aria-hidden>{Array.from({ length: f.drops }, (_, i) => <Droplet key={i} className="-mx-0.5 h-3.5 w-3.5 fill-current" />)}</span>}
              {f.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-nc-ink">Symptoms</legend>
        <div className="flex flex-wrap gap-2">
          {SYMPTOM_OPTIONS.map((s) => (
            <button key={s.id} type="button" aria-pressed={symptoms.includes(s.id)} onClick={() => toggle(symptoms, setSymptoms, s.id)} className={chip(symptoms.includes(s.id))}>
              <span aria-hidden>{s.emoji}</span> {s.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-nc-ink">Mood</legend>
        <div className="flex flex-wrap gap-2">
          {MOOD_OPTIONS.map((m) => (
            <button key={m.id} type="button" aria-pressed={moods.includes(m.id)} onClick={() => toggle(moods, setMoods, m.id)} className={chip(moods.includes(m.id))}>
              <span aria-hidden>{m.emoji}</span> {m.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-nc-ink">Notes <span className="font-normal text-slate-500">(optional)</span></span>
        <textarea rows={2} maxLength={1000} value={notes} onChange={(e) => { setSaved(false); setNotes(e.target.value); }} placeholder="Anything else you noticed…" className="m3-input resize-none" />
      </label>

      {error && <Callout tone="danger" role="alert">{error}</Callout>}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <span role="status" aria-live="polite" className="text-sm text-emerald-700">{saved && <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" aria-hidden /> Saved</span>}</span>
        <button type="button" onClick={save} disabled={pending} className="m3-btn-filled w-full sm:w-auto">
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save {label.toLowerCase() === "today" ? "today's" : "this day's"} log
        </button>
      </div>
    </section>
  );
}
