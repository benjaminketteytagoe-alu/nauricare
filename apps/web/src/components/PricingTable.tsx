"use client";

import { useState } from "react";
import { GraduationCap, Check } from "lucide-react";
import { PaymentCheckoutModal, type PlanDisplay } from "./PaymentCheckoutModal";
import { formatUSD, effectiveMonthlyCents } from "@/lib/pricing";

interface PricingTableProps {
  plans: PlanDisplay[];
  currentStatus: string | null;
  currentTier: string | null;
  isTrialing: boolean;
  trialEndsAt: string | null;
}

const TIER_FEATURES = [
  "Community Forums & Group Discussions",
  "AI Symptom Checker & Health Triage",
  "Teleconsultations & Direct Provider Messaging",
];

export function PricingTable({ plans, currentStatus, currentTier, isTrialing, trialEndsAt }: PricingTableProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanDisplay | null>(null);
  const monthlyPlan = plans.find((p) => p.tier === "MONTHLY");

  return (
    <div className="space-y-8">
      {isTrialing && trialEndsAt && (
        <div className="card-surface p-5 bg-purple-50 border-purple-100 flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-purple-600 shrink-0" />
          <p className="text-sm text-purple-900">
            You&apos;re on the <span className="font-semibold">Student Trial</span> — full access until{" "}
            {new Date(trialEndsAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}.
          </p>
        </div>
      )}

      <div className="card-surface p-5 bg-rose-50 border-rose-100 flex items-center gap-3">
        <GraduationCap className="w-6 h-6 text-rose-600 shrink-0" />
        <p className="text-sm text-rose-900">
          <span className="font-semibold">Student?</span> Sign in with your school email (
          <span className="font-mono">@alustudent.com</span> or any <span className="font-mono">.edu</span> address)
          for 3 Months Free!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const monthlyRateCents = effectiveMonthlyCents(plan.priceCents, plan.billingPeriodMonths);
          const savingsPct = monthlyPlan
            ? Math.round((1 - monthlyRateCents / monthlyPlan.priceCents) * 100)
            : 0;
          const isCurrent = currentStatus === "ACTIVE" && currentTier === plan.tier;
          const isBestValue = plan.tier === "YEARLY";

          return (
            <div
              key={plan.id}
              className={`card-surface p-6 flex flex-col relative ${isBestValue ? "border-rose-300 shadow-md" : ""}`}
            >
              {isBestValue && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Best Value
                </span>
              )}
              <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">{formatUSD(monthlyRateCents)}</span>
                <span className="text-sm text-gray-500">/mo</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formatUSD(plan.priceCents)} billed every {plan.billingPeriodMonths}{" "}
                {plan.billingPeriodMonths === 1 ? "month" : "months"}
              </p>
              {savingsPct > 0 && (
                <p className="text-xs font-semibold text-emerald-600 mt-1">Save {savingsPct}% vs. Monthly</p>
              )}

              <ul className="mt-5 space-y-2 flex-1">
                {TIER_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setSelectedPlan(plan)}
                disabled={isCurrent}
                className="mt-6 w-full btn-brand rounded-xl py-2.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCurrent ? "Current Plan" : "Subscribe"}
              </button>
            </div>
          );
        })}
      </div>

      {selectedPlan && <PaymentCheckoutModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />}
    </div>
  );
}
