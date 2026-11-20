// apps/web/src/app/dashboard/symptoms/page.tsx
"use client";

import { ArrowLeft, Activity } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TriageResultCard, type TriageView } from "@/components/triage/TriageResultCard";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientValue } from "@/lib/hooks/useClientValue";

const COMMON_SYMPTOMS = [
  "Cramps",
  "Bloating",
  "Headache",
  "Fatigue",
  "Heavy Bleeding",
  "Spotting",
  "Nausea",
  "Mood Swings",
  "Lower Back Pain",
  "Breast Tenderness",
  "Insomnia",
  "Acne",
];

export default function SymptomLoggerPage() {
  const router = useRouter();
  // ?saved=1 is set after a landing-page Nauri assessment is saved to this account.
  const justSaved = useClientValue(() => window.location.search.includes("saved=1"), false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [cycleDay, setCycleDay] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<{ triage: TriageView; checkId: string } | null>(null);
  const [error, setError] = useState("");

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) => (prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedSymptoms.length === 0) {
      setError("Please select at least one symptom to log.");
      return;
    }

    if (!loading) setLoading(true);
    setError("");
    setAiResponse(null);

    try {
      const res = await fetch("/api/symptoms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms: selectedSymptoms,
          cycleDay: parseInt(cycleDay) || 0,
          notes,
        }),
      });

      const data = await res.json();
      // Consent was withdrawn in another tab, or the notice version changed:
      // re-render the layout so the consent gate shows again.
      if (res.status === 403 && data.code === "CONSENT_REQUIRED") {
        router.refresh();
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed to log symptoms.");

      setAiResponse({ triage: data.triage, checkId: data.log.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log symptoms.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {justSaved && (
        <Callout tone="success" role="status" title="Your Nauri assessment is saved">
          It&apos;s now part of your health log. Log how you feel below whenever things change.
        </Callout>
      )}

      {/* Navigation */}
      <Link href="/dashboard" className="text-brand-ink hover:text-brand-ink flex items-center gap-2 font-medium w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="card-surface overflow-hidden">
        <div className="bg-brand-pressed p-6 text-white">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-on-brand/80" /> Daily Health Log
          </h1>
          <p className="text-on-brand mt-1">
            Track how you are feeling today to build a better picture of your reproductive health.
          </p>
        </div>

        <div className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-danger-soft text-danger p-3 rounded-md text-sm border border-danger-line">{error}</div>
            )}

            {/* Symptom Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold text-ink">What are you experiencing today?</Label>
              <div className="flex flex-wrap gap-3 mt-2">
                {COMMON_SYMPTOMS.map((symptom) => {
                  const isSelected = selectedSymptoms.includes(symptom);
                  return (
                    <button
                      key={symptom}
                      type="button"
                      onClick={() => toggleSymptom(symptom)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                        isSelected
                          ? "bg-brand border-brand text-white shadow-sm"
                          : "bg-surface border-hairline text-ink-soft hover:border-brand-line hover:bg-brand-soft"
                      }`}
                    >
                      {symptom}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cycle Context */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="cycleDay" className="text-sm font-semibold text-ink">
                  Cycle Day (Optional)
                </Label>
                <Input
                  id="cycleDay"
                  type="number"
                  min="1"
                  max="100"
                  placeholder="e.g., 14"
                  value={cycleDay}
                  onChange={(e) => setCycleDay(e.target.value)}
                  className="h-11 focus-visible:ring-focus"
                />
                <p className="text-xs text-ink-muted">Day 1 is the first day of your period.</p>
              </div>
            </div>

            {/* Personal Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-semibold text-ink">
                Additional Notes
              </Label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any emotional changes, triggers, or severity details..."
                className="w-full rounded-md border border-field bg-surface px-3 py-2 text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-focus"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full md:w-auto h-11 px-8 btn-brand">
              {loading ? "Analyzing Context..." : "Save Daily Log"}
            </Button>
          </form>
        </div>
      </div>

      {/* AI triage result (MedGemma → Gemini → safety rules) */}
      {aiResponse && <TriageResultCard triage={aiResponse.triage} symptomCheckId={aiResponse.checkId} />}
    </div>
  );
}
