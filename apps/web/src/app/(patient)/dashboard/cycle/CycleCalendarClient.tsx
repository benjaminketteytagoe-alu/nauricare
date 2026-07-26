"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Droplet, Moon, Save } from "lucide-react";
import { addDays, toDateKey } from "@/lib/cycleDates";
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

export function CycleCalendarClient({ initialData }: { initialData: CycleData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

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
      const result = await logPeriodRange({ startDate: selStart, endDate: selEnd });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSelStart(null);
      setSelEnd(null);
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

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Cycle Calendar</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Avg cycle {averages.cycleLength} days · Avg period {averages.periodLength} days
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToMonth(-1)}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-gray-900 w-36 text-center">{monthLabel}</span>
          <button
            onClick={() => goToMonth(1)}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i} className="text-center text-xs font-semibold text-gray-400 py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const { inSelection, isLogged, isPredictedPeriod, isOvulation, isToday } = cellStatus(cell.key);
          const solid = inSelection || isLogged;

          return (
            <button
              key={cell.key}
              onClick={() => handleDayClick(cell.key)}
              disabled={isPending}
              className={[
                "aspect-square rounded-xl text-sm font-medium flex items-center justify-center transition-colors relative",
                !cell.inCurrentMonth ? "text-gray-300" : "text-gray-700",
                solid ? "bg-rose-500 text-white hover:bg-rose-600" : "hover:bg-gray-50",
                !solid && isPredictedPeriod ? "border-2 border-dashed border-rose-400 bg-rose-50" : "",
                !solid && !isPredictedPeriod && isOvulation ? "border-2 border-dashed border-purple-400 bg-purple-50 text-purple-700" : "",
                isToday ? "ring-2 ring-teal-500 ring-offset-1" : "",
              ].join(" ")}
            >
              {cell.dayOfMonth}
              {isOvulation && (solid || isPredictedPeriod) && (
                <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-purple-500" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 mt-6 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-500" /> Logged period
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full border-2 border-dashed border-rose-400 bg-rose-50" /> Predicted period
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full border-2 border-dashed border-purple-400 bg-purple-50" /> Predicted ovulation
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full ring-2 ring-teal-500" /> Today
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

      <div className="mt-6 flex items-center justify-between border-t border-gray-50 pt-6">
        <div className="text-sm text-gray-500">
          {selStart && !selEnd && <span>Start selected — click an end date.</span>}
          {selStart && selEnd && (
            <span className="flex items-center gap-1.5 text-gray-900 font-medium">
              <Droplet className="w-4 h-4 text-rose-500" /> {selStart} → {selEnd}
            </span>
          )}
          {!selStart && prediction && (
            <span className="flex items-center gap-1.5">
              <Moon className="w-4 h-4 text-purple-500" /> Next period predicted {prediction.nextStart}
            </span>
          )}
        </div>
        {selStart && selEnd && (
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-rose-500 rounded-xl hover:bg-rose-600 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {isPending ? "Saving..." : "Save Period Log"}
          </button>
        )}
      </div>
    </div>
  );
}
