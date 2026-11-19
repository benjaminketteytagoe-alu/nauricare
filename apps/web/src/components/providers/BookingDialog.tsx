"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, CheckCircle2, Clock, Loader2, X } from "lucide-react";
import { Callout } from "@/components/ui/callout";

/** Book a 60-minute video consultation with a provider. */
export function BookingDialog({ provider, onClose }: { provider: { id: string; name: string }; onClose: () => void }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function book(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const startTime = new Date(`${date}T${time}:00`);
      if (Number.isNaN(startTime.getTime()) || startTime < new Date()) throw new Error("Please choose a date and time in the future.");
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practitionerProfileId: provider.id, startTime: startTime.toISOString(), endTime: endTime.toISOString(), notes }),
      });
      if (!res.ok) {
        const raw = await res.text();
        let msg = raw;
        try {
          msg = JSON.parse(raw).error ?? raw;
        } catch {
          /* plain-text error */
        }
        throw new Error(msg || "Failed to book appointment.");
      }
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to book appointment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="book-title" onClick={(e) => e.stopPropagation()} className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-rose-100 p-5 sm:p-6">
          <div>
            <h2 id="book-title" className="text-xl font-bold text-nc-ink">Book a video consultation</h2>
            <p className="mt-1 text-sm text-slate-600">With {provider.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" aria-hidden /></button>
        </div>
        {done ? (
          <div className="space-y-4 p-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
            <p className="font-semibold text-nc-ink">Your consultation is booked</p>
            <p className="text-sm text-slate-600">We&apos;ve emailed you the details and the video link.</p>
            <button type="button" onClick={onClose} className="m3-btn-filled">Done</button>
          </div>
        ) : (
          <form onSubmit={book} className="space-y-5 p-5 sm:p-6">
            {error && <Callout tone="danger" role="alert">{error}</Callout>}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1.5 flex items-center gap-2 font-semibold text-nc-ink"><Calendar className="h-4 w-4 text-slate-400" aria-hidden /> Date</span>
                <input type="date" required value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className="m3-input" />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 flex items-center gap-2 font-semibold text-nc-ink"><Clock className="h-4 w-4 text-slate-400" aria-hidden /> Time (your local time)</span>
                <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className="m3-input" />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1.5 block font-semibold text-nc-ink">What would you like to discuss? <span className="font-normal text-slate-500">(optional)</span></span>
              <textarea rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} className="m3-input resize-none" />
            </label>
            <button type="submit" disabled={busy} className="m3-btn-filled w-full py-3">
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} {busy ? "Booking…" : "Confirm booking"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
