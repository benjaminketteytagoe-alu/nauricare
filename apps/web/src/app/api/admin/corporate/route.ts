import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { maskEmail } from "@/lib/mask";

// Admin console: every Organization plus its subscription state and any
// payment transactions still awaiting review (MoMo VERIFYING or
// INVOICE_WIRE/STRIPE PENDING).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      subscription: true,
      paymentTransactions: {
        where: { status: { in: ["PENDING", "VERIFYING"] } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const rows = organizations.map((org) => ({
    id: org.id,
    name: org.name,
    corporateEmailDomain: org.corporateEmailDomain,
    contactPersonName: org.contactPersonName,
    contactEmail: maskEmail(org.contactEmail),
    allocatedSeats: org.allocatedSeats,
    usedSeats: org.usedSeats,
    createdAt: org.createdAt,
    subscription: org.subscription
      ? {
          tier: org.subscription.tier,
          billingCycle: org.subscription.billingCycle,
          status: org.subscription.status,
          pricePerSeatMonth: org.subscription.pricePerSeatMonth,
          totalContractValue: org.subscription.totalContractValue,
          paymentMethod: org.subscription.paymentMethod,
          currentPeriodEnd: org.subscription.currentPeriodEnd,
        }
      : null,
    pendingTransactions: org.paymentTransactions.map((t) => ({
      id: t.id,
      method: t.method,
      status: t.status,
      amountCents: t.amountCents,
      momoTransactionRef: t.momoTransactionRef,
      momoPhoneNumber: t.momoPhoneNumber,
      createdAt: t.createdAt,
    })),
  }));

  return NextResponse.json(rows);
}
