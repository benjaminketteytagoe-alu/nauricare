import type { CorporateBillingCycle, CorporateTier } from "@prisma/client";

// Source of truth for corporate seat pricing — every price is looked up
// here server-side; a client-supplied tier/price is never trusted.
// All arithmetic happens in integer cents; conversion to the Float DB
// columns (per the schema's stated dollar granularity) happens only at
// the point of storage, so rounding error never compounds through a chain
// of calculations.
interface TierConfig {
  tier: CorporateTier;
  minSeats: number;
  maxSeats: number; // Infinity for the open-ended top tier
  monthlyCentsPerSeat: number;
  annualCentsPerSeat: number; // effective monthly rate when billed annually
}

export const MIN_CORPORATE_SEATS = 10;

const TIERS: TierConfig[] = [
  { tier: "STARTER", minSeats: 10, maxSeats: 49, monthlyCentsPerSeat: 899, annualCentsPerSeat: 650 },
  { tier: "GROWTH", minSeats: 50, maxSeats: 199, monthlyCentsPerSeat: 699, annualCentsPerSeat: 499 },
  // Enterprise is explicitly "custom rate" — these are the pre-negotiation
  // defaults shown on the pricing page / used until an admin overrides them
  // during account setup.
  { tier: "ENTERPRISE", minSeats: 200, maxSeats: Infinity, monthlyCentsPerSeat: 450, annualCentsPerSeat: 324 },
];

export function tierForSeatCount(seats: number): CorporateTier {
  const match = TIERS.find((t) => seats >= t.minSeats && seats <= t.maxSeats);
  return (match ?? TIERS[TIERS.length - 1]).tier;
}

export function tierConfigFor(tier: CorporateTier): TierConfig {
  const config = TIERS.find((t) => t.tier === tier);
  if (!config) throw new Error(`Unknown corporate tier: ${tier}`);
  return config;
}

export interface CorporatePricingResult {
  tier: CorporateTier;
  seats: number;
  billingCycle: CorporateBillingCycle;
  pricePerSeatMonthCents: number;
  totalMonthlyCents: number;
  totalContractCents: number; // full contract value for one billing period (1mo or 12mo)
}

export function calculateCorporatePricing(seats: number, billingCycle: CorporateBillingCycle): CorporatePricingResult {
  const tier = tierForSeatCount(seats);
  const config = tierConfigFor(tier);
  const pricePerSeatMonthCents = billingCycle === "ANNUAL" ? config.annualCentsPerSeat : config.monthlyCentsPerSeat;
  const totalMonthlyCents = pricePerSeatMonthCents * seats;
  const totalContractCents = billingCycle === "ANNUAL" ? totalMonthlyCents * 12 : totalMonthlyCents;

  return { tier, seats, billingCycle, pricePerSeatMonthCents, totalMonthlyCents, totalContractCents };
}

export function centsToDollars(cents: number): number {
  return Math.round(cents) / 100;
}

export function formatUSD(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
