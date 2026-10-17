"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardCopy, Hospital as HospitalIcon,
  Loader2, MapPin, Phone, ShieldCheck, Stethoscope,
} from "lucide-react";
import type { InsuranceProvider } from "@prisma/client";
import {
  INSURANCE_OPTIONS, KIGALI_DISTRICTS, SPECIALTIES, insuranceLabel,
  type Specialty, type TriageSeverity,
} from "@/lib/referrals/constants";
import { EmergencyBanner } from "@/components/triage/EmergencyBanner";
import { FloatingField } from "./FloatingField";

export interface WizardInsurance {
  provider: InsuranceProvider;
  policyNumber: string;
  principalMember: string;
  expiryDate: string; // yyyy-mm-dd or ""
}

export interface WizardPrefill {
  symptomCheckId?: string;
  severity?: TriageSeverity;
  specialty?: Specialty;
  reason?: string;
}

interface HospitalOption {
  id: string;
  name: string;
  address: string;
  district: string;
  phone: string;
  supportedInsurances: InsuranceProvider[];
}

interface CreatedReferral {
  referralCode: string;
  hospital: { name: string; address: string; phone: string };
  specialtyRequired: string;
  triageSeverity: string;
}

const STEPS = ["Reason", "Insurance", "Hospital", "Review"] as const;

const SEVERITY_CHIP: Record<TriageSeverity, string> = {
  LOW: "bg-nc-primary-container text-nc-primary",
  MODERATE: "bg-nc-amber-container text-nc-amber",
  URGENT: "bg-nc-berry-container text-nc-berry",
};

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Referral steps">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none" aria-current={active ? "step" : undefined}>
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                done || active ? "bg-nc-primary text-white" : "border border-slate-300 bg-white text-slate-500"
              }`}
            >
              {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
            </span>
            <span className={`hidden text-sm font-medium sm:inline ${active ? "text-nc-ink" : "text-slate-500"}`}>{label}</span>
            {i < STEPS.length - 1 && (
              <span className={`h-px flex-1 ${done ? "bg-nc-primary" : "bg-nc-divider"}`} aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function ReferralWizard({ prefill, initialInsurance }: { prefill: WizardPrefill; initialInsurance: WizardInsurance | null }) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Step 1
  const [specialty, setSpecialty] = useState<Specialty>(prefill.specialty ?? "Obstetrics & Gynecology");
  const [reason, setReason] = useState(prefill.reason ?? "");

  // Step 2
  const [insurance, setInsurance] = useState<WizardInsurance>(
    initialInsurance ?? { provider: "NONE_CASH", policyNumber: "", principalMember: "", expiryDate: "" },
  );
  const [policyError, setPolicyError] = useState("");

  // Step 3
  const [district, setDistrict] = useState<string>("");
  const [hospitals, setHospitals] = useState<HospitalOption[] | null>(null);
  const [hospitalId, setHospitalId] = useState("");

  // Step 4
  const [consented, setConsented] = useState(false);
  const [created, setCreated] = useState<CreatedReferral | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedHospital = useMemo(() => hospitals?.find((h) => h.id === hospitalId) ?? null, [hospitals, hospitalId]);
  const severity = prefill.severity;

  useEffect(() => {
    if (step !== 2) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ insurance: insurance.provider });
    if (district) params.set("district", district);
    fetch(`/api/hospitals?${params}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Could not load hospitals."))))
      .then((d: { hospitals: HospitalOption[] }) => {
        setHospitals(d.hospitals);
        setHospitalId((prev) => (d.hospitals.some((h) => h.id === prev) ? prev : ""));
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [step, district, insurance.provider]);

  function go(next: number) {
    setError("");
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveInsuranceAndContinue() {
    setPolicyError("");
    if (insurance.provider !== "NONE_CASH" && !insurance.policyNumber.trim()) {
      setPolicyError("Enter your policy or membership number.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/insurance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(insurance),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save your insurance details.");
      setHospitals(null);
      go(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your insurance details.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospitalId,
          specialtyRequired: specialty,
          clinicalReason: reason,
          symptomCheckId: prefill.symptomCheckId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not create your referral.");
      setCreated(data.referral);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create your referral.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard can be blocked; the code is still visible on screen */
    }
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (created) {
    return (
      <div className="m3-card p-6 text-center sm:p-10">
        <CheckCircle2 className="mx-auto h-12 w-12 text-nc-primary" aria-hidden />
        <h2 className="mt-4 text-2xl font-bold text-nc-ink">Your referral is ready</h2>
        <p className="mx-auto mt-2 max-w-md text-slate-600">
          Show this code at the reception desk of {created.hospital.name}. Bring your ID and insurance card.
        </p>
        <div className="mx-auto mt-6 flex max-w-sm items-center justify-between gap-3 rounded-xl border border-nc-divider bg-slate-50 px-5 py-4">
          <span className="font-mono text-xl font-bold tracking-wider text-nc-ink">{created.referralCode}</span>
          <button type="button" onClick={copyCode} className="m3-btn-outlined px-4 py-2" aria-live="polite">
            <ClipboardCopy className="h-4 w-4" aria-hidden /> {copied ? "Copied" : "Copy"}
          </button>
        </div>
        {created.triageSeverity === "URGENT" && <EmergencyBanner className="mx-auto mt-6 max-w-lg text-left" />}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard/referrals" className="m3-btn-filled">View my referrals</Link>
          <Link href="/dashboard" className="m3-btn-outlined">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {severity === "URGENT" && <EmergencyBanner />}

      <div className="m3-card p-5 sm:p-6">
        <Stepper current={step} />
      </div>

      <div className="m3-card p-5 sm:p-8">
        {error && (
          <div role="alert" className="mb-6 rounded-lg border border-rose-200 bg-nc-berry-container px-4 py-3 text-sm text-nc-berry">
            {error}
          </div>
        )}

        {/* ── Step 1: Reason ─────────────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-nc-ink">Why do you need a referral?</h2>
              <p className="mt-1 text-sm text-slate-600">The hospital team reads this before you arrive.</p>
            </div>

            {severity && (
              <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                Triage result from your symptom check:
                <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${SEVERITY_CHIP[severity]}`}>{severity}</span>
              </p>
            )}

            <fieldset>
              <legend className="mb-3 text-sm font-semibold text-nc-ink">Specialist needed</legend>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map((s) => (
                  <button key={s} type="button" aria-pressed={specialty === s} onClick={() => setSpecialty(s)} className="m3-chip">
                    {specialty === s && <Check className="h-4 w-4" aria-hidden />}
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="reason" className="mb-2 block text-sm font-semibold text-nc-ink">Reason for referral</label>
              <textarea
                id="reason"
                rows={6}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={2000}
                className="m3-input resize-y leading-relaxed"
                placeholder="Describe your symptoms, how long you have had them, and anything that makes them better or worse."
              />
              <p className="mt-1 text-right text-xs text-slate-500">{reason.length} / 2000</p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="m3-btn-filled"
                disabled={reason.trim().length < 10}
                onClick={() => go(1)}
              >
                Continue <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Insurance ──────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-nc-ink">How will you pay?</h2>
              <p className="mt-1 text-sm text-slate-600">We save this to your profile and show hospitals that accept it.</p>
            </div>

            <fieldset>
              <legend className="sr-only">Insurance provider</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {INSURANCE_OPTIONS.map((opt) => {
                  const checked = insurance.provider === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                        checked ? "border-nc-primary bg-nc-primary-container" : "border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="insurance"
                        value={opt.value}
                        checked={checked}
                        onChange={() => setInsurance((i) => ({ ...i, provider: opt.value }))}
                        className="mt-1 h-4 w-4 accent-nc-primary"
                      />
                      <span>
                        <span className="block font-semibold text-nc-ink">{opt.label}</span>
                        <span className="block text-xs text-slate-500">{opt.hint}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {insurance.provider !== "NONE_CASH" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FloatingField
                  id="policyNumber"
                  label="Policy / membership number"
                  value={insurance.policyNumber}
                  maxLength={64}
                  autoComplete="off"
                  error={policyError}
                  onChange={(e) => setInsurance((i) => ({ ...i, policyNumber: e.target.value }))}
                />
                <FloatingField
                  id="principalMember"
                  label="Principal member (if not you)"
                  value={insurance.principalMember}
                  maxLength={120}
                  onChange={(e) => setInsurance((i) => ({ ...i, principalMember: e.target.value }))}
                />
                <FloatingField
                  id="expiryDate"
                  type="date"
                  label="Card expiry date"
                  value={insurance.expiryDate}
                  hint="Optional"
                  onChange={(e) => setInsurance((i) => ({ ...i, expiryDate: e.target.value }))}
                />
              </div>
            )}

            <div className="flex justify-between gap-3">
              <button type="button" className="m3-btn-outlined" onClick={() => go(0)}>
                <ArrowLeft className="h-4 w-4" aria-hidden /> Back
              </button>
              <button type="button" className="m3-btn-filled" disabled={busy} onClick={saveInsuranceAndContinue}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Continue <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Hospital ───────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-nc-ink">Choose a hospital</h2>
              <p className="mt-1 text-sm text-slate-600">
                {insurance.provider === "NONE_CASH"
                  ? "Showing all partner hospitals."
                  : `Showing hospitals listed as accepting ${insuranceLabel(insurance.provider)}.`}
              </p>
            </div>

            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by district">
              {["", ...KIGALI_DISTRICTS].map((d) => (
                <button key={d || "all"} type="button" aria-pressed={district === d} onClick={() => setDistrict(d)} className="m3-chip">
                  {d || "All districts"}
                </button>
              ))}
            </div>

            {hospitals === null ? (
              <div className="flex items-center gap-2 py-10 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Loading hospitals…
              </div>
            ) : hospitals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
                No partner hospitals match these filters. Try another district, or choose cash payment.
              </div>
            ) : (
              <fieldset>
                <legend className="sr-only">Hospital</legend>
                <ul className="space-y-3">
                  {hospitals.map((h) => {
                    const checked = h.id === hospitalId;
                    return (
                      <li key={h.id}>
                        <label
                          className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-colors ${
                            checked ? "border-nc-primary bg-nc-primary-container" : "border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="hospital"
                            value={h.id}
                            checked={checked}
                            onChange={() => setHospitalId(h.id)}
                            className="mt-1 h-4 w-4 accent-nc-primary"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-nc-ink">{h.name}</span>
                            <span className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                              <MapPin className="h-4 w-4 shrink-0" aria-hidden /> {h.address} · {h.district}
                            </span>
                            {h.phone && (
                              <span className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600">
                                <Phone className="h-4 w-4 shrink-0" aria-hidden /> {h.phone}
                              </span>
                            )}
                            <span className="mt-2 flex flex-wrap gap-1.5">
                              {h.supportedInsurances.map((p) => (
                                <span key={p} className="rounded-md bg-nc-amber-container px-2 py-0.5 text-xs font-medium text-nc-amber">
                                  {insuranceLabel(p)}
                                </span>
                              ))}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            )}

            <p className="text-xs text-slate-500">Coverage can change. Confirm with the hospital before your visit.</p>

            <div className="flex justify-between gap-3">
              <button type="button" className="m3-btn-outlined" onClick={() => go(1)}>
                <ArrowLeft className="h-4 w-4" aria-hidden /> Back
              </button>
              <button type="button" className="m3-btn-filled" disabled={!hospitalId} onClick={() => go(3)}>
                Continue <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Review ─────────────────────────────────────────────── */}
        {step === 3 && selectedHospital && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-nc-ink">Review and confirm</h2>

            <dl className="divide-y divide-nc-divider rounded-xl border border-nc-divider">
              <div className="flex gap-3 p-4">
                <Stethoscope className="mt-0.5 h-5 w-5 text-nc-primary" aria-hidden />
                <div className="min-w-0">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Specialist</dt>
                  <dd className="font-semibold text-nc-ink">{specialty}</dd>
                  <dd className="mt-1 whitespace-pre-line break-words text-sm text-slate-600">{reason}</dd>
                </div>
              </div>
              <div className="flex gap-3 p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-nc-primary" aria-hidden />
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Payment</dt>
                  <dd className="font-semibold text-nc-ink">{insuranceLabel(insurance.provider)}</dd>
                  {insurance.policyNumber && insurance.provider !== "NONE_CASH" && (
                    <dd className="text-sm text-slate-600">Policy {insurance.policyNumber}</dd>
                  )}
                </div>
              </div>
              <div className="flex gap-3 p-4">
                <HospitalIcon className="mt-0.5 h-5 w-5 text-nc-primary" aria-hidden />
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Hospital</dt>
                  <dd className="font-semibold text-nc-ink">{selectedHospital.name}</dd>
                  <dd className="text-sm text-slate-600">{selectedHospital.address} · {selectedHospital.district}</dd>
                </div>
              </div>
            </dl>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-nc-divider p-4">
              <input
                type="checkbox"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
                className="mt-1 h-4 w-4 accent-nc-primary"
              />
              <span className="text-sm text-slate-700">
                I agree to share my referral reason and insurance details with {selectedHospital.name}, as described in the{" "}
                <Link href="/consent" target="_blank" className="font-medium text-nc-primary underline underline-offset-2">
                  informed consent
                </Link>{" "}
                and{" "}
                <Link href="/privacy" target="_blank" className="font-medium text-nc-primary underline underline-offset-2">
                  privacy policy
                </Link>
                .
              </span>
            </label>

            <div className="flex justify-between gap-3">
              <button type="button" className="m3-btn-outlined" onClick={() => go(2)}>
                <ArrowLeft className="h-4 w-4" aria-hidden /> Back
              </button>
              <button type="button" className="m3-btn-filled" disabled={!consented || busy} onClick={submit}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Create referral
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
