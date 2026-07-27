"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Droplet, Moon, Save,
  Activity, StickyNote, Sparkles, HeartPulse, BellRing,
} from "lucide-react";
import { addDays, diffInDays, parseDateKey, toDateKey } from "@/lib/cycleDates";
import { logPeriodRange, type CycleData } from "./actions";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

type DayCell = {
  key: string;
  dayOfMonth: number;
  inCurrentMonth: boolean;
};

function buildMonthGrid(year: number, month: number): DayCell[] {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const leadingBlanks = firstOfMonth.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells: DayCell[] = [];
  for (let i = leadingBlanks; i > 0; i--) {
    const date = addDays(firstOfMonth, -i);
    cells.push({ key: toDateKey(date), dayOfMonth: date.getUTCDate(), inCurrentMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(year, month, day));
    cells.push({ key: toDateKey(date), dayOfMonth: day, inCurrentMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const lastKey = cells[cells.length - 1].key;
    const date = addDays(new Date(`${lastKey}T00:00:00.000Z`), 1);
    cells.push({ key: toDateKey(date), dayOfMonth: date.getUTCDate(), inCurrentMonth: false });
  }
  return cells;
}

function isKeyInRange(key: string, start: string, end: string): boolean {
  return key >= start && key <= end;
}

function formatShort(key: string): string {
  return parseDateKey(key).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function CycleCalendarClient({ initialData }: { initialData: CycleData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");

  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(today.getUTCMonth());

  const [selStart, setSelStart] = useState<string | null>(null);
  const [selEnd, setSelEnd] = useState<string | null>(null);

  const { logs, prediction, averages } = initialData;
  const todayKey = toDateKey(today);
  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  function goToMonth(delta: number) {
    const next = new Date(Date.UTC(viewYear, viewMonth + delta, 1));
    setViewYear(next.getUTCFullYear());
    setViewMonth(next.getUTCMonth());
  }

  function beginLogging() {
    setSelStart(todayKey);
    setSelEnd(null);
    setError("");
  }

  function handleDayClick(key: string) {
    setError("");
    if (!selStart || selEnd) {
      setSelStart(key);
      setSelEnd(null);
      return;
    }
    if (key < selStart) {
      setSelStart(key);
      setSelEnd(null);
      return;
    }
    setSelEnd(key);
  }

  function handleSave() {
    if (!selStart || !selEnd) return;
    setError("");
    startTransition(async () => {
      const result = await logPeriodRange({ startDate: selStart, endDate: selEnd, notes: notes.trim() || undefined });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSelStart(null);
      setSelEnd(null);
      setNotes("");
      setShowNotes(false);
      router.refresh();
    });
  }

  function cellStatus(key: string) {
    const inSelection =
      selStart && (selEnd ? isKeyInRange(key, selStart, selEnd) : key === selStart);
    const isLogged = logs.some((log) => isKeyInRange(key, log.startDate, log.endDate ?? log.startDate));
    const isPredictedPeriod = prediction ? isKeyInRange(key, prediction.nextStart, prediction.nextEnd) : false;
    const isOvulation = prediction ? key === prediction.ovulationDay : false;
    return { inSelection, isLogged, isPredictedPeriod, isOvulation, isToday: key === todayKey };
  }

  const monthLabel = new Date(Date.UTC(viewYear, viewMonth, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  // ── Daily insights (derived straight from the server-computed prediction) ──
  const fertileWindow = prediction
    ? { start: toDateKey(addDays(parseDateKey(prediction.ovulationDay), -5)), end: toDateKey(addDays(parseDateKey(prediction.ovulationDay), 1)) }
    : null;

  const daysUntilNextPeriod = prediction ? diffInDays(parseDateKey(prediction.nextStart), today) : null;
  const isInPredictedPeriod = prediction ? isKeyInRange(todayKey, prediction.nextStart, prediction.nextEnd) : false;
  const isNearOvulation = prediction ? Math.abs(diffInDays(parseDateKey(prediction.ovulationDay), today)) <= 2 : false;

  let healthTip = "Log a few cycles to unlock personalized predictions and tips.";
  if (isInPredictedPeriod) {
    healthTip = "You're likely in your period window — prioritize rest, hydration, and iron-rich foods.";
  } else if (isNearOvulation) {
    healthTip = "You're near your predicted ovulation day — energy is often highest now.";
  } else if (daysUntilNextPeriod !== null) {
    healthTip = `Avg. cycle is ${averages.cycleLength} days — track symptoms daily for sharper predictions.`;
  }

  return (
    <div className="space-y-6">
      {/* ── Compact calendar card ── */}
      <div className="card-surface p-5 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">My Cycle Calendar</h2>
            <p className="text-[11px] text-gray-500">
              Avg cycle {averages.cycleLength}d · period {averages.periodLength}d
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToMonth(-1)}
              className="p-1.5 rounded-lg border border-rose-100 text-gray-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-semibold text-gray-900 w-24 text-center">{monthLabel}</span>
            <button
              onClick={() => goToMonth(1)}
              className="p-1.5 rounded-lg border border-rose-100 text-gray-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1 justify-items-center">
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={i} className="text-center text-[10px] font-semibold text-gray-400 py-1">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 justify-items-center">
          {cells.map((cell) => {
            const { inSelection, isLogged, isPredictedPeriod, isOvulation, isToday } = cellStatus(cell.key);
            const solid = inSelection || isLogged;

            return (
              <button
                key={cell.key}
                onClick={() => handleDayClick(cell.key)}
                disabled={isPending}
                className={[
                  "w-9 h-9 rounded-full text-xs flex items-center justify-center transition-colors relative",
                  !cell.inCurrentMonth ? "text-gray-300" : "text-gray-700",
                  solid ? "bg-rose-600 text-white font-bold shadow-sm shadow-rose-200 hover:bg-rose-700" : "hover:bg-rose-50",
                  !solid && isPredictedPeriod ? "border-2 border-dashed border-rose-400 bg-rose-100 text-rose-800" : "",
                  !solid && !isPredictedPeriod && isOvulation ? "border-2 border-dashed border-purple-400 bg-purple-100 text-purple-900 font-medium" : "",
                  isToday && !solid ? "ring-2 ring-rose-500 ring-offset-2 bg-rose-50/60 font-bold" : "",
                ].join(" ")}
              >
                {cell.dayOfMonth}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-4 text-[10px] text-gray-600">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> Logged
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-rose-400 bg-rose-100" /> Predicted period
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-purple-400 bg-purple-100" /> Ovulation
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full ring-2 ring-rose-500 ring-offset-1" /> Today
          </div>
        </div>

        {error && <p className="text-xs text-red-600 mt-3">{error}</p>}

        {showNotes && (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes for this log (flow, symptoms, mood)…"
            rows={2}
            className="w-full mt-4 text-sm border border-rose-100 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
          />
        )}

        <div className="mt-4 flex items-center justify-between border-t border-rose-100/60 pt-4">
          <div className="text-xs text-gray-500">
            {selStart && !selEnd && <span>Start selected — pick an end date.</span>}
            {selStart && selEnd && (
              <span className="flex items-center gap-1.5 text-gray-900 font-medium">
                <Droplet className="w-3.5 h-3.5 text-rose-500" /> {formatShort(selStart)} → {formatShort(selEnd)}
              </span>
            )}
            {!selStart && prediction && (
              <span className="flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-purple-500" /> Next period ~{formatShort(prediction.nextStart)}
              </span>
            )}
          </div>
          {selStart && selEnd && (
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold btn-brand rounded-xl disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isPending ? "Saving..." : "Save Period Log"}
            </button>
          )}
        </div>
      </div>

      {/* ── Quick action row ── */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={beginLogging}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 transition-colors"
        >
          <Droplet className="w-4 h-4 text-rose-600" /> Log Period
        </button>
        <Link
          href="/dashboard/symptoms"
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-orange-50 text-orange-700 border border-orange-100 hover:bg-orange-100 transition-colors"
        >
          <Activity className="w-4 h-4 text-orange-600" /> Log Symptoms
        </Link>
        <button
          onClick={() => setShowNotes((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-teal-50 text-teal-700 border border-teal-100 hover:bg-teal-100 transition-colors"
        >
          <StickyNote className="w-4 h-4 text-teal-600" /> Notes
        </button>
      </div>

      {/* ── Daily insights ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-purple-50/80 border border-purple-100 rounded-3xl p-5">
          <div className="flex items-center gap-2 text-purple-700 font-bold text-sm mb-1.5">
            <Sparkles className="w-4 h-4" /> Fertile Window
          </div>
          <p className="text-xs text-purple-900/80 leading-relaxed">
            {fertileWindow
              ? `${formatShort(fertileWindow.start)} – ${formatShort(fertileWindow.end)}`
              : "Log a period to see your projected fertile window."}
          </p>
        </div>
        <div className="bg-teal-50/80 border border-teal-100 rounded-3xl p-5">
          <div className="flex items-center gap-2 text-teal-700 font-bold text-sm mb-1.5">
            <HeartPulse className="w-4 h-4" /> Health Tip
          </div>
          <p className="text-xs text-teal-900/80 leading-relaxed">{healthTip}</p>
        </div>
        <div className="bg-rose-50/80 border border-rose-100 rounded-3xl p-5">
          <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-1.5">
            <BellRing className="w-4 h-4" /> Reminder
          </div>
          <p className="text-xs text-rose-900/80 leading-relaxed">
            {daysUntilNextPeriod !== null
              ? daysUntilNextPeriod >= 0
                ? `Next period predicted in ${daysUntilNextPeriod} day${daysUntilNextPeriod === 1 ? "" : "s"}.`
                : "Your predicted period window has started — log it when it begins."
              : "Log your first period to start getting reminders."}
          </p>
        </div>
      </div>
    </div>
  );
}
