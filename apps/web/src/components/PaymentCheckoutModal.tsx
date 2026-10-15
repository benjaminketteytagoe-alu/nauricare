"use client";

import { useState } from "react";
import { X, Smartphone, CreditCard, Loader2, CheckCircle2 } from "lucide-react";
import { formatUSD } from "@/lib/pricing";

export interface PlanDisplay {
  id: string;
  tier: string;
  name: string;
  priceCents: number;
  billingPeriodMonths: number;
}

// Demo/sandbox merchant code — replace with the real NauriCare MTN MoMo
// merchant code before going live.
const MOMO_MERCHANT_CODE = "689123";

export function PaymentCheckoutModal({ plan, onClose }: { plan: PlanDisplay; onClose: () => void }) {
  const [tab, setTab] = useState<"momo" | "stripe">("momo");

  const [referenceCode, setReferenceCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [momoError, setMomoError] = useState("");
  const [momoSubmitting, setMomoSubmitting] = useState(false);
  const [momoSubmitted, setMomoSubmitted] = useState(false);

  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState("");

  const referenceValid = /^[A-Za-z0-9-]{4,64}$/.test(referenceCode.trim());

  async function handleMomoSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!referenceValid) {
      setMomoError("Enter the reference code exactly as shown after your USSD payment.");
      return;
    }
    setMomoError("");
    setMomoSubmitting(true);
    try {
      const res = await fetch("/api/payments/momo/submit-ref", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          referenceCode: referenceCode.trim(),
          phoneNumber: phoneNumber.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit reference code.");
      setMomoSubmitted(true);
    } catch (err) {
      setMomoError(err instanceof Error ? err.message : "Failed to submit reference code.");
    } finally {
      setMomoSubmitting(false);
    }
  }

  async function handleStripeCheckout() {
    setStripeError("");
    setStripeLoading(true);
    try {
      const res = await fetch("/api/payments/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start checkout.");
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setStripeError(err instanceof Error ? err.message : "Failed to start checkout.");
      setStripeLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card-surface w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-rose-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Subscribe to {plan.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {formatUSD(plan.priceCents)} · {plan.billingPeriodMonths}-month plan
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-rose-100">
          <button
            onClick={() => setTab("momo")}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
              tab === "momo" ? "text-rose-700 border-b-2 border-rose-600 bg-rose-50/40" : "text-gray-500"
            }`}
          >
            <Smartphone className="w-4 h-4" /> MTN MoMo
          </button>
          <button
            onClick={() => setTab("stripe")}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
              tab === "stripe" ? "text-rose-700 border-b-2 border-rose-600 bg-rose-50/40" : "text-gray-500"
            }`}
          >
            <CreditCard className="w-4 h-4" /> Visa / Mastercard
          </button>
        </div>

        <div className="p-6">
          {tab === "momo" ? (
            momoSubmitted ? (
              <div className="text-center py-6 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h3 className="font-bold text-slate-900">Reference submitted</h3>
                <p className="text-sm text-gray-500">
                  We&apos;re verifying your payment — this usually takes a few minutes. Your plan activates
                  automatically once confirmed.
                </p>
                <button onClick={onClose} className="btn-brand rounded-xl px-6 py-2.5 text-sm font-bold mt-2">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleMomoSubmit} className="space-y-4">
                <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">1. Dial on your phone:</p>
                  <p className="font-mono text-base text-rose-700">*182*8*1*{MOMO_MERCHANT_CODE}#</p>
                  <p className="text-xs text-gray-500">
                    Merchant Code: <span className="font-mono">{MOMO_MERCHANT_CODE}</span> · Amount:{" "}
                    {formatUSD(plan.priceCents)}
                  </p>
                  <p className="font-semibold text-slate-900 pt-2">2. Enter the reference code you receive below:</p>
                </div>

                {momoError && <p className="text-sm text-red-600">{momoError}</p>}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reference Code</label>
                  <input
                    type="text"
                    required
                    value={referenceCode}
                    onChange={(e) => setReferenceCode(e.target.value)}
                    placeholder="e.g. MP240815.1234.A56789"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">MoMo Phone Number (optional)</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+250 78 000 0000"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={momoSubmitting || !referenceCode}
                  className="w-full btn-brand rounded-xl py-3 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {momoSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {momoSubmitting ? "Submitting..." : "Submit for Verification"}
                </button>
              </form>
            )
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Pay securely with Visa or Mastercard via Stripe. You&apos;ll be redirected to a secure checkout page.
              </p>
              {stripeError && <p className="text-sm text-red-600">{stripeError}</p>}
              <button
                onClick={handleStripeCheckout}
                disabled={stripeLoading}
                className="w-full btn-brand rounded-xl py-3 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {stripeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {stripeLoading ? "Redirecting..." : `Pay ${formatUSD(plan.priceCents)} with Card`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
