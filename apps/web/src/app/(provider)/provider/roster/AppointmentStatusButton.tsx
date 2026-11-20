"use client";

import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useState, useTransition } from "react";
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
      COMPLETED: "bg-success-soft text-success border-success-line",
      CANCELLED: "bg-surface-muted text-ink-muted border-hairline",
      MISSED: "bg-brand-soft text-brand-ink border-brand-line",
    };
    const labels: Record<string, string> = {
      COMPLETED: "Completed",
      CANCELLED: "Cancelled",
      MISSED: "Did Not Attend",
    };
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${styles[status]}`}
      >
        {status === "COMPLETED" && <CheckCircle2 className="w-3.5 h-3.5" />}
        {status === "MISSED" && <AlertTriangle className="w-3.5 h-3.5" />}
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
          className="flex items-center gap-1.5 px-3 py-1.5 bg-success-soft hover:bg-success-soft text-success border border-success-line rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Mark Done
        </button>
        <button
          onClick={() => act("MISSED")}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-soft hover:bg-brand-soft text-brand-ink border border-brand-line rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <XCircle className="w-3.5 h-3.5" />
          DNA
        </button>
      </div>
      {error && <p className="text-xs text-brand-ink">{error}</p>}
    </div>
  );
}
