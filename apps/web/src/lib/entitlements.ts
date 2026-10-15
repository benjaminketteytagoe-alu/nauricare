import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { SubscriptionStatus, SubscriptionTier } from "@prisma/client";

export interface EntitlementResult {
  active: boolean;
  status: SubscriptionStatus | null;
  tier: SubscriptionTier | null;
  isTrialing: boolean;
  isCorporate: boolean;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
}

const INACTIVE: EntitlementResult = {
  active: false,
  status: null,
  tier: null,
  isTrialing: false,
  isCorporate: false,
  trialEndsAt: null,
  currentPeriodEnd: null,
};

async function checkIndividualSubscription(userId: string): Promise<EntitlementResult> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return INACTIVE;

  const now = new Date();
  const trialExpired = sub.status === "TRIALING" && sub.trialEndsAt !== null && sub.trialEndsAt < now;
  const periodExpired = sub.status === "ACTIVE" && sub.currentPeriodEnd !== null && sub.currentPeriodEnd < now;

  if (trialExpired || periodExpired) {
    await prisma.subscription.update({ where: { userId }, data: { status: "EXPIRED" } });
    return { ...INACTIVE, status: "EXPIRED", tier: sub.tier, trialEndsAt: sub.trialEndsAt, currentPeriodEnd: sub.currentPeriodEnd };
  }

  const active = sub.status === "ACTIVE" || sub.status === "TRIALING";
  return {
    active,
    status: sub.status,
    tier: sub.tier,
    isTrialing: sub.status === "TRIALING",
    isCorporate: false,
    trialEndsAt: sub.trialEndsAt,
    currentPeriodEnd: sub.currentPeriodEnd,
  };
}

/**
 * Corporate seat access is a LIVE check against the employer's
 * CorporateSubscription.status — unlike the student trial's permanent
 * one-time grant, revoking the org's subscription (or the employer
 * cancelling) must immediately remove every employee's access, not just
 * freeze it at whatever was true when they joined.
 */
async function checkCorporateEntitlement(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isCorporateEmployee: true,
      organization: {
        select: { subscription: { select: { status: true, currentPeriodEnd: true } } },
      },
    },
  });

  const sub = user?.isCorporateEmployee ? user.organization?.subscription : null;
  if (!sub || sub.status !== "ACTIVE") return false;
  if (sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) return false;
  return true;
}

/**
 * Server-side entitlement check for the three gated premium features
 * (Community, AI Symptom Checker, Teleconsultations/Messaging/Booking).
 * Lazily flips an expired TRIALING/ACTIVE individual row to EXPIRED on read
 * so entitlement never depends on a background job having run. A user is
 * entitled if EITHER their individual subscription/trial is active OR they
 * hold a seat in an organization with an active CorporateSubscription.
 */
export async function checkSubscriptionStatus(userId: string): Promise<EntitlementResult> {
  const [individual, hasCorporateSeat] = await Promise.all([
    checkIndividualSubscription(userId),
    checkCorporateEntitlement(userId),
  ]);

  if (hasCorporateSeat) {
    return { ...individual, active: true, isCorporate: true };
  }
  return individual;
}

export const UPGRADE_PATH = "/dashboard/pricing";

/** Route Handler guard — call after your own auth/role check. Returns a 403 JSON response when not entitled. */
export async function requirePremiumApi(userId: string): Promise<
  { ok: true; entitlement: EntitlementResult } | { ok: false; response: NextResponse }
> {
  const entitlement = await checkSubscriptionStatus(userId);
  if (!entitlement.active) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "This feature requires an active subscription or student trial.", upgradeUrl: UPGRADE_PATH },
        { status: 403 },
      ),
    };
  }
  return { ok: true, entitlement };
}

/** Server Component page guard — redirects to the pricing page with an upgrade CTA when not entitled. */
export async function requirePremiumPage(userId: string): Promise<EntitlementResult> {
  const entitlement = await checkSubscriptionStatus(userId);
  if (!entitlement.active) {
    redirect(`${UPGRADE_PATH}?upgrade=1`);
  }
  return entitlement;
}
