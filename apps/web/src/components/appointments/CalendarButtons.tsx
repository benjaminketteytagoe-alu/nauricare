"use client";

import { CalendarPlus } from "lucide-react";
import { generateGoogleCalendarUrl, generateIcsFile, type AppointmentForCalendar } from "@/lib/calendar";

interface Props {
  appointment: AppointmentForCalendar;
  title?: string;
  variant?: "teal" | "slate" | "rose";
}

export function CalendarButtons({ appointment, title, variant = "slate" }: Props) {
  const handleIcsDownload = () => {
    const ics = generateIcsFile(appointment, title);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nauricare-${appointment.id}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const googleUrl = generateGoogleCalendarUrl(appointment, title);

  const baseBtn =
    variant === "teal"
      ? "border border-brand-line/50 text-on-brand hover:bg-brand-hover/50"
      : variant === "rose"
        ? "border border-brand-line/50 text-on-brand hover:bg-brand-hover/50"
        : "border border-hairline text-ink-soft hover:bg-surface-muted";

  return (
    <div className="flex items-center gap-1.5">
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${baseBtn}`}
      >
        <CalendarPlus className="w-3.5 h-3.5" />
        Google Calendar
      </a>
      <button
        onClick={handleIcsDownload}
        className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${baseBtn}`}
      >
        .ics
      </button>
    </div>
  );
}
