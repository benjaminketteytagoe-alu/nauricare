import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, Hospital, ShieldAlert, Stethoscope, Video } from "lucide-react";
import type { TriageSeverity } from "@/lib/referrals/constants";
import { EmergencyBanner } from "./EmergencyBanner";
import { SEVERITY_TONE, StatusChip } from "@/components/ui/status-chip";

export interface TriageView {
  severity: TriageSeverity;
  summary: string;
  recommendedSpecialty: string;
  redFlags: string[];
  selfCare: string[];
  seekCareWithin: string;
  engine: "medgemma" | "gemini" | "rules";
}

const SEVERITY_STYLES: Record<TriageSeverity, { label: string; icon: typeof CheckCircle2 }> = {
  LOW: { label: "Low urgency", icon: CheckCircle2 },
  MODERATE: { label: "See a clinician soon", icon: AlertTriangle },
  URGENT: { label: "Urgent care needed", icon: ShieldAlert },
};

const ENGINE_LABEL: Record<TriageView["engine"], string> = {
  medgemma: "Assessed by MedGemma",
  gemini: "Assessed by Gemini",
  rules: "Assessed by NauriCare safety rules",
};

export function TriageResultCard({ triage, symptomCheckId }: { triage: TriageView; symptomCheckId: string }) {
  const style = SEVERITY_STYLES[triage.severity];
  const Icon = style.icon;
  const needsCare = triage.severity !== "LOW";

  return (
    <section
      aria-live="polite"
      className="m3-card overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-nc-divider px-6 py-4">
        <StatusChip tone={SEVERITY_TONE[triage.severity]} className="px-3 py-1 text-sm">
          <Icon className="h-4 w-4" aria-hidden />
          {style.label}
        </StatusChip>
        <span className="text-xs font-medium text-slate-500">{ENGINE_LABEL[triage.engine]}</span>
      </header>

      <div className="space-y-6 p-6">
        {triage.severity === "URGENT" && <EmergencyBanner />}

        <p className="leading-relaxed text-slate-700">{triage.summary}</p>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl border border-nc-divider p-3">
            <Stethoscope className="mt-0.5 h-5 w-5 text-nc-primary" aria-hidden />
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Suggested specialist</dt>
              <dd className="font-semibold text-nc-ink">{triage.recommendedSpecialty}</dd>
            </div>
          </div>
          {triage.seekCareWithin && (
            <div className="flex items-start gap-3 rounded-xl border border-nc-divider p-3">
              <Clock className="mt-0.5 h-5 w-5 text-nc-primary" aria-hidden />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Seek care</dt>
                <dd className="font-semibold text-nc-ink">{triage.seekCareWithin}</dd>
              </div>
            </div>
          )}
        </dl>

        {triage.redFlags.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-nc-ink">Warning signs we noticed</h3>
            <ul className="space-y-1.5">
              {triage.redFlags.map((flag) => (
                <li key={flag} className="flex gap-2 text-sm text-slate-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-nc-amber" aria-hidden />
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}

        {triage.selfCare.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-nc-ink">What may help now</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {triage.selfCare.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

        {needsCare && (
          <div className="flex flex-wrap gap-3 border-t border-nc-divider pt-5">
            <Link href={`/dashboard/referrals/new?checkId=${encodeURIComponent(symptomCheckId)}`} className="m3-btn-filled">
              <Hospital className="h-4 w-4" aria-hidden /> Create hospital referral
            </Link>
            <Link href="/dashboard/providers" className="m3-btn-outlined">
              <Video className="h-4 w-4" aria-hidden /> Consult a specialist online
            </Link>
          </div>
        )}

        <p className="text-xs leading-relaxed text-slate-500">
          This is AI-assisted triage, not a diagnosis. It cannot examine you. Read our{" "}
          <Link href="/consent" className="font-medium text-nc-primary underline underline-offset-2">
            AI triage consent
          </Link>{" "}
          to understand its limits.
        </p>
      </div>
    </section>
  );
}
