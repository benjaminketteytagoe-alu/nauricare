import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth/next";
import { CreditCard } from "lucide-react";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { checkSubscriptionStatus } from "@/lib/entitlements";
import { PricingTable } from "@/components/PricingTable";

export const dynamic = "force-dynamic";

// Intentionally NOT gated by requirePremiumPage — this is the destination
// the gate redirects *to*, so gating it would create a redirect loop.
export default async function PricingPage() {
  await cookies();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [plans, entitlement] = await Promise.all([
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { billingPeriodMonths: "asc" } }),
    checkSubscriptionStatus(session.user.id),
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-rose-600" />
          Upgrade Your Plan
        </h1>
        <p className="text-gray-500 mt-1">
          Unlock Community, AI Symptom Checker, and Teleconsultations with a NauriCare subscription.
        </p>
      </div>

      <PricingTable
        plans={plans.map((p) => ({
          id: p.id,
          tier: p.tier,
          name: p.name,
          priceCents: p.priceCents,
          billingPeriodMonths: p.billingPeriodMonths,
        }))}
        currentStatus={entitlement.status}
        currentTier={entitlement.tier}
        isTrialing={entitlement.isTrialing}
        trialEndsAt={entitlement.trialEndsAt ? entitlement.trialEndsAt.toISOString() : null}
      />
    </div>
  );
}
