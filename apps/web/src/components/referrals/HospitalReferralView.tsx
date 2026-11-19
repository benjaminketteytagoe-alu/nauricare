"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, KeyRound, Loader2, Lock, Printer, Siren } from "lucide-react";
import { Callout } from "@/components/ui/callout";
import { SEVERITY_TONE, StatusChip } from "@/components/ui/status-chip";
import { formatDate, formatDateTime } from "@/lib/format";
import { insuranceLabel } from "@/lib/referrals/constants";
import type { ReferralSharePayload } from "@/server/referrals/share.service";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words text-nc-ink">{value}</dd>
    </div>
  );
}

export function HospitalReferralView({ token }: { token: string }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<ReferralSharePayload | null>(null);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/r/${encodeURIComponent(token)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not open this referral.");
      setData(body.referral);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open this referral.");
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${data.referral.code}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const insurance = (data?.insurance ?? null) as { provider?: string; providerLabel?: string; policyNumber?: string | null; principalMember?: string | null; expiryDate?: string | null } | null;

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-8 print:bg-white print:p-0 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Image src="/logo-horizontal.jpg" alt="NauriCare" width={150} height={40} className="h-8 w-auto" />
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500"><Lock className="h-3.5 w-3.5" aria-hidden /> Confidential patient referral</span>
        </header>

        {!data ? (
          <form onSubmit={unlock} className="m3-card mx-auto max-w-md space-y-5 p-6 sm:p-8">
            <div>
              <h1 className="text-xl font-bold text-nc-ink">Open patient referral</h1>
              <p className="mt-1 text-sm text-slate-600">
                Enter the referral code the patient gave you (it starts with <span className="font-mono">NC-REF-</span>).
                This second check protects the patient if the link reaches the wrong person.
              </p>
            </div>
            {error && <Callout tone="danger" role="alert">{error}</Callout>}
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-nc-ink"><KeyRound className="h-4 w-4" aria-hidden /> Referral code</span>
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required minLength={6} maxLength={20} autoComplete="off" spellCheck={false} placeholder="NC-REF-XXXXXX" className="m3-input font-mono tracking-wider" />
            </label>
            <button type="submit" disabled={busy} className="m3-btn-filled w-full">
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Open referral
            </button>
            <p className="text-center text-xs text-slate-500">Access is logged and shown to the patient.</p>
          </form>
        ) : (
          <article className="m3-card space-y-6 p-6 print:border-0 print:shadow-none sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-sm font-semibold tracking-wider text-nc-primary">{data.referral.code}</p>
                <h1 className="mt-1 text-2xl font-bold text-nc-ink">{data.patient.fullName}</h1>
                <p className="text-sm text-slate-600">Referred to {data.hospital.name} · {data.referral.specialtyRequired}</p>
              </div>
              <StatusChip tone={SEVERITY_TONE[data.referral.triageSeverity] ?? "neutral"} className="px-3 py-1 text-sm">{data.referral.triageSeverity} urgency</StatusChip>
            </div>

            {data.referral.triageSeverity === "URGENT" && (
              <Callout tone="danger" icon={Siren} title="Triage flagged this referral as urgent">Please prioritise this patient.</Callout>
            )}

            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Patient</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" value={data.patient.fullName} />
                <Field label="Date of birth" value={data.patient.dateOfBirth ? formatDate(data.patient.dateOfBirth, "long") : null} />
                <Field label="Phone" value={data.patient.phone} />
                <Field label="Email" value={data.patient.email} />
                <Field label="Country" value={data.patient.country} />
                <Field label="Emergency contact" value={data.patient.emergencyContact} />
              </dl>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Reason for referral</h2>
              <p className="whitespace-pre-line leading-relaxed text-slate-800">{data.referral.clinicalReason}</p>
              <p className="mt-2 text-xs text-slate-500">Created {formatDateTime(data.referral.createdAt)} on NauriCare. Severity comes from NauriCare&apos;s AI-assisted triage, not a clinical diagnosis.</p>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Payment</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label="Insurer" value={insurance?.providerLabel ?? (insurance?.provider ? insuranceLabel(insurance.provider) : "Not provided")} />
                <Field label="Policy / membership number" value={insurance?.policyNumber} />
                <Field label="Principal member" value={insurance?.principalMember} />
                <Field label="Card expiry" value={insurance?.expiryDate ? formatDate(insurance.expiryDate, "long") : null} />
              </dl>
            </section>

            <div className="flex flex-wrap gap-3 border-t border-nc-divider pt-5 print:hidden">
              <button type="button" onClick={() => window.print()} className="m3-btn-filled"><Printer className="h-4 w-4" aria-hidden /> Print</button>
              <button type="button" onClick={download} className="m3-btn-outlined"><Download className="h-4 w-4" aria-hidden /> Download for booking system (JSON)</button>
            </div>
            <p className="text-xs text-slate-500">Link valid until {formatDate(data.expiresAt, "long")}. Handle this information under your hospital&apos;s patient-confidentiality policy.</p>
          </article>
        )}
      </div>
    </main>
  );
}
