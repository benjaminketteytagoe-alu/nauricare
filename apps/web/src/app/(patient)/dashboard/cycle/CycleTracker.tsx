"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarRange, ChevronLeft, ChevronRight, Droplet, Loader2, Trash2, X } from "lucide-react";
import { addDays, diffInDays, localDateKey, parseDateKey, toDateKey } from "@/lib/cycleDates";
import { phaseForDay, PHASES } from "@/lib/cycle/catalog";
import { Callout } from "@/components/ui/callout";
import { CycleRing } from "@/components/cycle/CycleRing";
import { DayLogPanel } from "@/components/cycle/DayLogPanel";
import { PhaseCard } from "@/components/cycle/PhaseCard";
import { CycleInsights } from "@/components/cycle/CycleInsights";
import { deletePeriod, endPeriod, logPeriodRange, startPeriod, type CycleData } from "./actions";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MAX_PERIOD_DAYS = 14;
const fmt = (key: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) => parseDateKey(key).toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
const inRange = (k: string, a: string, b: string) => k >= a && k <= b;

function monthGrid(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const start = addDays(first, -first.getUTCDay());
  const weeks = Math.ceil((first.getUTCDay() + new Date(Date.UTC(year, month + 1, 0)).getUTCDate()) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const d = addDays(start, i);
    return { key: toDateKey(d), day: d.getUTCDate(), inMonth: d.getUTCMonth() === month };
  });
}

// The viewer's local date; null during server render (avoids hydration mismatch).
const subscribe = () => () => {};
function useTodayKey() {
  return useSyncExternalStore(subscribe, () => localDateKey(), () => null);
}

export function CycleTracker({ data }: { data: CycleData }) {
  const todayKey = useTodayKey();
  return todayKey ? <Tracker data={data} todayKey={todayKey} /> : <p className="py-16 text-center text-slate-500">Loading your cycle…</p>;
}

function Tracker({ data, todayKey }: { data: CycleData; todayKey: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(todayKey);
  const [rangeMode, setRangeMode] = useState(false);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [view, setView] = useState(() => ({ y: Number(todayKey.slice(0, 4)), m: Number(todayKey.slice(5, 7)) - 1 }));

  const { logs, prediction, averages } = data;
  const dayLogs = useMemo(() => new Map(data.dayLogs.map((d) => [d.date, d])), [data.dayLogs]);
  // Ongoing = the latest period, with no end date, started within 14 days.
  // Older rows without an end date are shown at the average period length.
  const latest = logs[0];
  const openPeriod = latest && !latest.endDate && diffInDays(parseDateKey(todayKey), parseDateKey(latest.startDate)) < MAX_PERIOD_DAYS ? latest : null;
  const endOf = (l: (typeof logs)[number]) =>
    l.endDate ?? (l === openPeriod ? todayKey : toDateKey(addDays(parseDateKey(l.startDate), averages.periodLength - 1)));
  const cells = useMemo(() => monthGrid(view.y, view.m), [view]);

  // Where today sits in the cycle.
  const lastStart = logs[0]?.startDate ?? null;
  const cycleDay = lastStart ? diffInDays(parseDateKey(todayKey), parseDateKey(lastStart)) + 1 : null;
  const stale = cycleDay !== null && cycleDay > averages.cycleLength * 2; // old data: don't guess a phase
  const daysToNext = prediction ? diffInDays(parseDateKey(prediction.nextStart), parseDateKey(todayKey)) : null;
  const onPeriod = !!openPeriod || logs.some((l) => inRange(todayKey, l.startDate, endOf(l)));
  const phase = cycleDay && !stale ? (onPeriod ? "menstrual" : phaseForDay(Math.min(cycleDay, averages.cycleLength), averages.cycleLength, averages.periodLength)) : null;

  let headline = "Welcome";
  let subline = "Log your period to see your cycle.";
  if (onPeriod && cycleDay) {
    headline = `Period day ${cycleDay}`;
    subline = openPeriod ? "Tap “Period ended” when it stops." : "Take it easy today.";
  } else if (stale || cycleDay === null) {
    headline = "Log your period";
    subline = "Add your most recent period to get predictions.";
  } else if (daysToNext !== null && daysToNext > 0) {
    headline = `${daysToNext} day${daysToNext === 1 ? "" : "s"}`;
    subline = `until your next period (${fmt(prediction!.nextStart)})`;
  } else if (daysToNext !== null) {
    headline = daysToNext === 0 ? "Period due today" : `${-daysToNext} day${daysToNext === -1 ? "" : "s"} late`;
    subline = "Log it when it starts. Cycles vary, so a few days late is common.";
  }

  function run(fn: () => Promise<{ success: boolean; error?: string }>, after?: () => void) {
    setError("");
    startTransition(async () => {
      const res = await fn();
      if (!res.success) return setError(res.error ?? "Something went wrong.");
      after?.();
      router.refresh();
    });
  }

  function clickDay(key: string) {
    if (key > todayKey) return;
    if (!rangeMode) return setSelected(key);
    if (!rangeStart || rangeEnd || key < rangeStart) {
      setRangeStart(key);
      setRangeEnd(null);
    } else setRangeEnd(key);
  }

  const exitRange = () => {
    setRangeMode(false);
    setRangeStart(null);
    setRangeEnd(null);
  };

  const status = (key: string) => {
    const logged = logs.some((l) => inRange(key, l.startDate, endOf(l)));
    const predicted = !!prediction && inRange(key, prediction.nextStart, prediction.nextEnd);
    const fertile = !!prediction && inRange(key, prediction.fertileStart, prediction.fertileEnd);
    const ovulation = prediction?.ovulationDay === key;
    const ranged = !!rangeStart && (rangeEnd ? inRange(key, rangeStart, rangeEnd) : key === rangeStart);
    return { logged, predicted, fertile, ovulation, ranged };
  };

  const monthLabel = new Date(Date.UTC(view.y, view.m, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const selectedLabel = selected === todayKey ? "Today" : fmt(selected, { weekday: "short", day: "numeric", month: "short" });
  const heavy = [...dayLogs.values()].filter((d) => d.flow === "HEAVY" && diffInDays(parseDateKey(todayKey), parseDateKey(d.date)) < 10).length >= 3;

  return (
    <div className="space-y-6">
      {error && <Callout tone="danger" role="alert">{error}</Callout>}
      {heavy && (
        <Callout tone="warning" title="Heavy bleeding for several days">
          If you&apos;re soaking a pad or tampon every hour, passing large clots, or feeling dizzy or faint, please get medical advice. Heavy periods can be a sign of fibroids and are treatable.{" "}
          <Link href="/dashboard/symptoms" className="font-semibold underline">Check your symptoms</Link>
        </Callout>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Ring + quick actions */}
        <section aria-label="Your cycle today" className={`card-surface flex flex-col items-center gap-5 p-5 sm:p-6 ${phase ? PHASES[phase].tone.bg : ""}`}>
          <CycleRing cycleDay={stale ? null : cycleDay} cycleLength={averages.cycleLength} periodLength={averages.periodLength} headline={headline} subline={subline} phase={phase} />
          {phase && <p className={`rounded-full bg-white/80 px-4 py-1.5 text-sm font-semibold ${PHASES[phase].tone.text}`}>{PHASES[phase].name}</p>}
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            {openPeriod ? (
              <button type="button" disabled={pending} onClick={() => run(() => endPeriod(todayKey))} className="m3-btn-filled">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Droplet className="h-4 w-4" aria-hidden />} Period ended today
              </button>
            ) : (
              <button type="button" disabled={pending} onClick={() => run(() => startPeriod(todayKey))} className="m3-btn-filled">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Droplet className="h-4 w-4" aria-hidden />} My period started today
              </button>
            )}
            <button type="button" onClick={() => (rangeMode ? exitRange() : setRangeMode(true))} className="m3-btn-outlined">
              <CalendarRange className="h-4 w-4" aria-hidden /> {rangeMode ? "Cancel" : "Log a past period"}
            </button>
          </div>
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-600">
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Period</li>
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-teal-300" /> Fertile window</li>
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-teal-700" /> Ovulation</li>
          </ul>
        </section>

        {/* Calendar */}
        <section aria-labelledby="calendar-heading" className="card-surface p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 id="calendar-heading" className="text-lg font-bold text-nc-ink">{monthLabel}</h2>
            <div className="flex gap-1">
              <button type="button" aria-label="Previous month" onClick={() => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><ChevronLeft className="h-5 w-5" aria-hidden /></button>
              <button type="button" aria-label="Next month" onClick={() => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><ChevronRight className="h-5 w-5" aria-hidden /></button>
            </div>
          </div>
          {rangeMode && (
            <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {!rangeStart ? "Tap the day your period started." : !rangeEnd ? "Now tap the day it ended." : `${fmt(rangeStart)} to ${fmt(rangeEnd)}`}
            </p>
          )}
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400" aria-hidden>
            {WEEKDAYS.map((d, i) => <div key={i} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((c) => {
              const s = status(c.key);
              const log = dayLogs.get(c.key);
              const future = c.key > todayKey;
              const isSel = !rangeMode && c.key === selected;
              const filled = s.logged || s.ranged;
              return (
                <button
                  key={c.key}
                  type="button"
                  disabled={future || pending}
                  onClick={() => clickDay(c.key)}
                  aria-label={`${fmt(c.key, { weekday: "long", day: "numeric", month: "long" })}${s.logged ? ", period" : s.predicted ? ", predicted period" : s.ovulation ? ", predicted ovulation" : s.fertile ? ", fertile window" : ""}${log ? ", logged" : ""}`}
                  aria-pressed={isSel}
                  className="group relative mx-auto flex h-10 w-10 items-center justify-center sm:h-11 sm:w-11"
                >
                  <span
                    className={[
                      "flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors sm:h-10 sm:w-10",
                      !c.inMonth ? "opacity-40" : "",
                      filled ? "bg-rose-500 font-bold text-white" : s.predicted ? "border-2 border-dashed border-rose-400 text-rose-700" : s.ovulation ? "bg-teal-700 font-bold text-white" : s.fertile ? "bg-teal-100 text-teal-900" : future ? "text-slate-300" : "text-slate-700 group-hover:bg-slate-100",
                      c.key === todayKey && !filled ? "font-extrabold underline decoration-2 underline-offset-4" : "",
                      isSel ? "ring-2 ring-nc-primary ring-offset-2" : "",
                    ].join(" ")}
                  >
                    {c.day}
                  </span>
                  {log && <span className={`absolute bottom-0 h-1.5 w-1.5 rounded-full ${log.flow && log.flow !== "NONE" ? "bg-rose-500" : "bg-violet-500"}`} aria-hidden />}
                </button>
              );
            })}
          </div>
          {rangeMode && rangeStart && rangeEnd && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => logPeriodRange({ startDate: rangeStart, endDate: rangeEnd }), exitRange)}
              className="m3-btn-filled mt-4 w-full"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save period ({diffInDays(parseDateKey(rangeEnd), parseDateKey(rangeStart)) + 1} days)
            </button>
          )}
          {!rangeMode && <p className="mt-3 text-center text-xs text-slate-500">Tap a day to log how you felt. Dots mark days you&apos;ve logged.</p>}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <DayLogPanel key={selected} date={selected} label={selectedLabel} initial={dayLogs.get(selected) ?? null} />
        {phase ? <PhaseCard phase={phase} /> : <PhaseCard phase="follicular" />}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CycleInsights data={data} todayKey={todayKey} />
        <section aria-labelledby="history-heading" className="card-surface p-5 sm:p-6">
          <h2 id="history-heading" className="text-lg font-bold text-nc-ink">Period history</h2>
          {logs.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No periods logged yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {logs.slice(0, 8).map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="text-slate-700">
                    <span className="font-semibold text-nc-ink">{fmt(l.startDate, { day: "numeric", month: "short", year: "numeric" })}</span>
                    {l.endDate ? ` · ${diffInDays(parseDateKey(l.endDate), parseDateKey(l.startDate)) + 1} days` : l === openPeriod ? " · ongoing" : " · end not logged"}
                  </span>
                  <button type="button" disabled={pending} onClick={() => confirm("Delete this period?") && run(() => deletePeriod(l.id))} aria-label={`Delete period starting ${fmt(l.startDate)}`} className="rounded-full p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selected !== todayKey && !rangeMode && (
            <button type="button" onClick={() => setSelected(todayKey)} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-nc-primary hover:underline">
              <X className="h-4 w-4" aria-hidden /> Back to today
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
