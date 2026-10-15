"use client";

import { useMemo, useState } from "react";
import {
  Baby, Video, Activity, Users, Sparkles, X, Loader2, CheckCircle2, Smartphone, CreditCard, Building,
} from "lucide-react";
import {
  calculateCorporatePricing, formatUSD, MIN_CORPORATE_SEATS,
} from "@/lib/corporatePricing";
import { createCorporateAccount } from "@/app/actions/corporate";

const BENEFITS = [
  { icon: Activity, title: "Cycle & Symptom Tracking", desc: "Give every employee a private, AI-assisted tool for tracking cycles, PCOS, fibroids, and daily symptoms." },
  { icon: Baby, title: "Maternity & Reproductive Care", desc: "Confidential guidance through fertility, pregnancy, and postpartum — without going through a manager." },
  { icon: Video, title: "Confidential Teleconsultations", desc: "Direct, private video visits with verified specialists. HR never sees who booked what." },
  { icon: Users, title: "Peer Community", desc: "A moderated space to connect with others navigating similar reproductive health journeys." },
];

const MOMO_MERCHANT_CODE = "689123";

type BillingCycle = "MONTHLY" | "ANNUAL";
type PaymentMethod = "MOMO" | "STRIPE" | "INVOICE_WIRE";

interface FormState {
  organizationName: string;
  corporateEmailDomain: string;
  contactPersonName: string;
  contactEmail: string;
  contactPhone: string;
  paymentMethod: PaymentMethod;
}

const EMPTY_FORM: FormState = {
  organizationName: "",
  corporateEmailDomain: "",
  contactPersonName: "",
  contactEmail: "",
  contactPhone: "",
  paymentMethod: "MOMO",
};

export default function CorporatePricingPage() {
  const [seats, setSeats] = useState(50);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Result state after a successful createCorporateAccount() call
  const [result, setResult] = useState<
    | { kind: "stripe"; checkoutUrl: string }
    | { kind: "momo"; organizationId: string; totalContractCents: number }
    | { kind: "wire"; totalContractCents: number }
    | null
  >(null);

  // MoMo reference-code sub-step
  const [refCode, setRefCode] = useState("");
  const [refSubmitting, setRefSubmitting] = useState(false);
  const [refSubmitted, setRefSubmitted] = useState(false);
  const [refError, setRefError] = useState("");

  const pricing = useMemo(() => calculateCorporatePricing(seats, billingCycle), [seats, billingCycle]);
  const monthlyPricing = useMemo(() => calculateCorporatePricing(seats, "MONTHLY"), [seats]);
  const savingsPct = billingCycle === "ANNUAL"
    ? Math.round((1 - pricing.pricePerSeatMonthCents / monthlyPricing.pricePerSeatMonthCents) * 100)
    : 0;

  function openModal() {
    setForm(EMPTY_FORM);
    setError("");
    setResult(null);
    setRefCode("");
    setRefSubmitted(false);
    setRefError("");
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const res = await createCorporateAccount({
      organizationName: form.organizationName,
      corporateEmailDomain: form.corporateEmailDomain,
      contactPersonName: form.contactPersonName,
      contactEmail: form.contactEmail,
      contactPhone: form.contactPhone || undefined,
      seats,
      billingCycle,
      paymentMethod: form.paymentMethod,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error);
      return;
    }

    if ("checkoutUrl" in res) {
      setResult({ kind: "stripe", checkoutUrl: res.checkoutUrl });
    } else if (form.paymentMethod === "INVOICE_WIRE" && "transactionId" in res) {
      setResult({ kind: "wire", totalContractCents: res.pricing.totalContractCents });
    } else {
      setResult({ kind: "momo", organizationId: res.organizationId, totalContractCents: res.pricing.totalContractCents });
    }
  }

  async function handleSubmitRef(e: React.FormEvent) {
    e.preventDefault();
    if (result?.kind !== "momo") return;
    setRefError("");
    setRefSubmitting(true);
    try {
      const res = await fetch("/api/payments/corporate/momo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: result.organizationId, referenceCode: refCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit reference code.");
      setRefSubmitted(true);
    } catch (err) {
      setRefError(err instanceof Error ? err.message : "Failed to submit reference code.");
    } finally {
      setRefSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-teal-950 via-teal-900 to-teal-950 text-white py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-widest uppercase text-teal-300 bg-teal-800/50 px-3 py-1 rounded-full">
            <Sparkles className="w-3 h-3" /> NauriCare Corporate Care
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight">
            Reproductive & wellness benefits, built for your workforce
          </h1>
          <p className="text-teal-100 text-lg max-w-2xl mx-auto">
            Give every employee confidential access to cycle tracking, maternity care, and telehealth —
            without them ever needing to disclose a diagnosis to HR.
          </p>
          <button
            onClick={openModal}
            className="inline-flex items-center gap-2 bg-white text-teal-900 font-bold px-8 py-3.5 rounded-xl hover:bg-teal-50 transition-colors shadow-lg"
          >
            <Building className="w-5 h-5" /> Get Started
          </button>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-4 sm:px-6 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">What your team gets</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {BENEFITS.map((b) => (
            <div key={b.title} className="bg-teal-50/60 border border-teal-100 rounded-2xl p-6">
              <b.icon className="w-8 h-8 text-teal-600 mb-3" />
              <h3 className="font-bold text-gray-900 mb-1.5">{b.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive calculator */}
      <section className="py-16 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Estimate your plan</h2>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">Headcount</label>
                <span className="text-lg font-extrabold text-teal-700">{seats} seats</span>
              </div>
              <input
                type="range"
                min={MIN_CORPORATE_SEATS}
                max={500}
                value={seats}
                onChange={(e) => setSeats(Number(e.target.value))}
                className="w-full accent-teal-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{MIN_CORPORATE_SEATS}</span>
                <span>500+</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1 bg-gray-100 rounded-full p-1 w-fit mx-auto">
              {(["MONTHLY", "ANNUAL"] as BillingCycle[]).map((cycle) => (
                <button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                    billingCycle === cycle ? "bg-teal-600 text-white shadow-sm" : "text-gray-600"
                  }`}
                >
                  {cycle === "MONTHLY" ? "Monthly" : "Annual"}
                </button>
              ))}
            </div>

            <div className="text-center border-t border-gray-100 pt-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{pricing.tier} Tier</p>
              <div className="flex items-baseline justify-center gap-1 mt-1">
                <span className="text-4xl font-extrabold text-gray-900">{formatUSD(pricing.pricePerSeatMonthCents)}</span>
                <span className="text-sm text-gray-500">/ seat / mo</span>
              </div>
              {savingsPct > 0 && (
                <p className="text-sm font-semibold text-emerald-600 mt-1">Save {savingsPct}% vs. monthly billing</p>
              )}
              <p className="text-sm text-gray-500 mt-3">
                {formatUSD(pricing.totalMonthlyCents)}/mo total ·{" "}
                {formatUSD(pricing.totalContractCents)} billed {billingCycle === "ANNUAL" ? "annually" : "monthly"}
              </p>
              {pricing.tier === "ENTERPRISE" && (
                <p className="text-xs text-gray-400 mt-2">200+ seats — rates shown are a starting point; contact us for a custom quote.</p>
              )}
            </div>

            <button
              onClick={openModal}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3.5 rounded-xl transition-colors"
            >
              {pricing.tier === "ENTERPRISE" ? "Request a Custom Quote" : "Start Subscription"}
            </button>
          </div>
        </div>
      </section>

      {/* CTA Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {result ? "Complete Your Subscription" : "Start NauriCare Corporate Care"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!result ? (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && <p className="text-sm text-red-600">{error}</p>}
                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                  {seats} seats · {billingCycle === "ANNUAL" ? "Annual" : "Monthly"} billing ·{" "}
                  {formatUSD(pricing.totalContractCents)} total
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input required value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Email Domain</label>
                  <input required placeholder="company.rw" value={form.corporateEmailDomain} onChange={(e) => setForm({ ...form, corporateEmailDomain: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  <p className="text-xs text-gray-400 mt-1">Employees with this email domain auto-enroll once active.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">HR Contact Name</label>
                    <input required value={form.contactPersonName} onChange={(e) => setForm({ ...form, contactPersonName: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                    <input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                  <input required type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: "MOMO", label: "MTN MoMo", icon: Smartphone },
                      { value: "STRIPE", label: "Card", icon: CreditCard },
                      { value: "INVOICE_WIRE", label: "Wire", icon: Building },
                    ] as const).map((opt) => (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setForm({ ...form, paymentMethod: opt.value })}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-semibold transition-colors ${
                          form.paymentMethod === opt.value ? "border-teal-500 bg-teal-50 text-teal-700" : "border-gray-200 text-gray-500"
                        }`}
                      >
                        <opt.icon className="w-4 h-4" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? "Submitting..." : "Continue"}
                </button>
              </form>
            ) : result.kind === "stripe" ? (
              <div className="p-6 text-center space-y-4">
                <p className="text-sm text-gray-600">Redirecting you to secure checkout…</p>
                <a href={result.checkoutUrl} className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-3 rounded-xl">
                  Continue to Payment
                </a>
              </div>
            ) : result.kind === "wire" ? (
              <div className="p-6 space-y-4 text-sm text-gray-700">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-center font-semibold text-gray-900">Account created — pending wire transfer</p>
                <div className="bg-gray-50 rounded-lg p-4 space-y-1">
                  <p>Amount due: <span className="font-bold">{formatUSD(result.totalContractCents)}</span></p>
                  <p>Our finance team will email wire instructions to your contact address shortly.</p>
                  <p>Your account activates once we confirm receipt.</p>
                </div>
              </div>
            ) : refSubmitted ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h3 className="font-bold text-gray-900">Reference submitted</h3>
                <p className="text-sm text-gray-500">We&apos;ll confirm your payment and activate your account within one business day.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitRef} className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-gray-700">
                  <p className="font-semibold text-gray-900">1. Dial on your phone:</p>
                  <p className="font-mono text-base text-teal-700">*182*8*1*{MOMO_MERCHANT_CODE}#</p>
                  <p className="text-xs text-gray-500">
                    Merchant Code: <span className="font-mono">{MOMO_MERCHANT_CODE}</span> · Amount: {formatUSD(result.totalContractCents)}
                  </p>
                  <p className="font-semibold text-gray-900 pt-2">2. Enter the reference code you receive:</p>
                </div>
                {refError && <p className="text-sm text-red-600">{refError}</p>}
                <input
                  required
                  value={refCode}
                  onChange={(e) => setRefCode(e.target.value)}
                  placeholder="e.g. MP240815.1234.A56789"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-sm"
                />
                <button type="submit" disabled={refSubmitting} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl disabled:opacity-50">
                  {refSubmitting ? "Submitting..." : "Submit for Verification"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
