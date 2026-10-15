import type { SubscriptionTier } from "@prisma/client";

// Single source of truth for tier pricing. The seed script upserts Plan rows
// from this; every checkout/verification route re-reads the *live* Plan row
// from the DB rather than trusting this constant directly, so an admin could
// adjust prices in the DB later without a redeploy.
//
// Effective monthly rate is strictly Monthly > Quarterly > Yearly:
//   Monthly:   $12.99 / 1 month  = $12.99/mo
//   Quarterly: $29.99 / 3 months = $9.99/mo · saves ~23% vs monthly
//   Yearly:    $89.99 / 12 months = $7.50/mo · saves ~42% vs monthly
export const PLAN_DEFINITIONS: Record<
  SubscriptionTier,
  { name: string; priceCents: number; billingPeriodMonths: number }
> = {
  MONTHLY: { name: "Monthly", priceCents: 1299, billingPeriodMonths: 1 },
  QUARTERLY: { name: "Quarterly", priceCents: 2999, billingPeriodMonths: 3 },
  YEARLY: { name: "Yearly", priceCents: 8999, billingPeriodMonths: 12 },
};

export function effectiveMonthlyCents(priceCents: number, billingPeriodMonths: number): number {
  return Math.round(priceCents / billingPeriodMonths);
}

export function formatUSD(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export const STUDENT_TRIAL_MONTHS = 3;
