"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Callout } from "@/components/ui/callout";

interface Prefs {
  periodReminders: boolean;
  periodLeadDays: number;
  dailyLogReminders: boolean;
  weeklyInsights: boolean;
  appointmentReminders: boolean;
  emailEnabled: boolean;
  reminderHour: number;
  timezone: string;
}

const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** Reminder toggles. Each change saves immediately (optimistic, rolled back on failure). */
export function ReminderSettings() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    fetch("/api/settings/reminders")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(async (p: Prefs) => {
        // Adopt the browser's time zone the first time, so reminders arrive at local time.
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz && tz !== p.timezone && p.timezone === "Africa/Kigali") {
          const res = await fetch("/api/settings/reminders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ timezone: tz }) });
          if (res.ok) p = await res.json();
        }
        setPrefs(p);
      })
      .catch(() => setError("We couldn't load your reminder settings. Please refresh."));
    return () => clearTimeout(savedTimer.current);
  }, []);

  async function save(patch: Partial<Prefs>) {
    if (!prefs) return;
    const previous = prefs;
    setPrefs({ ...prefs, ...patch });
    setStatus("saving");
    setError("");
    try {
      const res = await fetch("/api/settings/reminders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save that change.");
      setPrefs(data);
      setStatus("saved");
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setStatus("idle"), 2000);
    } catch (e) {
      setPrefs(previous);
      setStatus("error");
      setError(e instanceof Error ? e.message : "Couldn't save that change.");
    }
  }

  if (!prefs) {
    return error ? <Callout tone="danger" role="alert">{error}</Callout> : <p className="py-8 text-center text-sm text-slate-500">Loading reminder settings…</p>;
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-nc-ink">Reminders</h2>
        <span role="status" aria-live="polite" className="flex items-center gap-1.5 text-sm text-slate-500">
          {status === "saving" && <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Saving…</>}
          {status === "saved" && <><CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden /> Saved</>}
        </span>
      </div>
      <p className="text-sm text-slate-600">Reminders appear in your notifications{prefs.emailEnabled ? " and by email" : ""}. Changes save automatically.</p>
      {error && <Callout tone="danger" role="alert" className="mt-4">{error}</Callout>}

      <div className="mt-2 divide-y divide-slate-100">
        <div>
          <Switch label="Period prediction" description="A heads-up before your next period is predicted to start." checked={prefs.periodReminders} onChange={(v) => save({ periodReminders: v })} />
          {prefs.periodReminders && (
            <label className="-mt-1 mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              Remind me
              <select value={prefs.periodLeadDays} onChange={(e) => save({ periodLeadDays: Number(e.target.value) })} className="m3-input w-auto py-1.5">
                {[0, 1, 2, 3, 5, 7].map((d) => <option key={d} value={d}>{d === 0 ? "on the day" : `${d} day${d > 1 ? "s" : ""} before`}</option>)}
              </select>
            </label>
          )}
        </div>
        <Switch label="Daily check-in" description="A gentle nudge to log your habits and symptoms, skipped if you've already logged that day." checked={prefs.dailyLogReminders} onChange={(v) => save({ dailyLogReminders: v })} />
        <Switch label="Weekly health summary" description="Every Monday: how your week went and what's coming up in your cycle." checked={prefs.weeklyInsights} onChange={(v) => save({ weeklyInsights: v })} />
        <Switch label="Consultation reminders" description="A reminder within 24 hours of a booked video consultation." checked={prefs.appointmentReminders} onChange={(v) => save({ appointmentReminders: v })} />
        <Switch label="Also send reminders by email" description="Turn off to receive reminders in the app only." checked={prefs.emailEnabled} onChange={(v) => save({ emailEnabled: v })} />
      </div>

      {(prefs.dailyLogReminders || prefs.weeklyInsights) && (
        <label className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          Send daily and weekly reminders at
          <select value={prefs.reminderHour} onChange={(e) => save({ reminderHour: Number(e.target.value) })} className="m3-input w-auto py-1.5">
            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
          </select>
          <span className="text-xs text-slate-500">({prefs.timezone.replace(/_/g, " ")})</span>
        </label>
      )}
    </div>
  );
}
