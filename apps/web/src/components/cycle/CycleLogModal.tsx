"use client";

import { X, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface CycleLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CycleLogModal({ isOpen, onClose, onSuccess }: CycleLogModalProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate }),
      });

      if (!response.ok) {
        throw new Error("Failed to log cycle data.");
      }

      // Refresh any server-rendered data, re-fetch this page's client-side cycle
      // state (useEffect only runs on mount — router.refresh() can't touch it),
      // then close the modal.
      router.refresh();
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-muted hover:text-ink-soft transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-brand-soft text-brand-ink rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-ink">Log Period</h3>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {error && <p className="text-sm text-danger">{error}</p>}

          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-ink-soft mb-1">
              First day of your last period
            </label>
            <input
              id="startDate"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-field rounded-lg focus:ring-2 focus:ring-focus focus:border-brand outline-none transition-all"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-ink-soft bg-surface-muted border border-field rounded-lg hover:bg-surface-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-sm font-medium text-on-brand bg-brand rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-colors"
            >
              {isLoading ? "Saving..." : "Save Log"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
