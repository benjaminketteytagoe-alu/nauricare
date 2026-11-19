"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { updateAppointmentStatus } from "@/actions/appointment";

type Status = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "MISSED";

const TERMINAL: Status[] = ["COMPLETED", "CANCELLED", "MISSED"];

export function AppointmentStatusButton({
  appointmentId,
  currentStatus,
}: {
  appointmentId: string;
  currentStatus: Status;
}) {
  const [status, setStatus] = useState<Status>(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  if (TERMINAL.includes(status)) {
    const styles: Record<string, string> = {
      COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
      CANCELLED:  "bg-slate-100 text-slate-500 border-slate-200",
      MISSED:     "bg-rose-50 text-rose-600 border-rose-200",
    };
    const labels: Record<string, string> = {
      COMPLETED: "Completed",
      CANCELLED:  "Cancelled",
      MISSED:     "Did Not Attend",
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${styles[status]}`}>
        {status === "COMPLETED" && <CheckCircle2 className="w-3.5 h-3.5" />}
        {status === "MISSED"    && <AlertTriangle className="w-3.5 h-3.5" />}
        {labels[status]}
      </span>
    );
  }

  function act(next: "COMPLETED" | "MISSED") {
    setError("");
    startTransition(async () => {
      const res = await updateAppointmentStatus(appointmentId, next);
      if (res.success) setStatus(next);
      else setError(res.error ?? "Failed");
    });
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <button
          onClick={() => act("COMPLETED")}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Mark Done
        </button>
        <button
          onClick={() => act("MISSED")}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <XCircle className="w-3.5 h-3.5" />
          DNA
        </button>
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}
