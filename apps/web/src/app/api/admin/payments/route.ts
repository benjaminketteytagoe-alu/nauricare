import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { maskEmail } from "@/lib/mask";

// Admin queue of MoMo transactions awaiting manual verification.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // organizationId: null — this queue is individual MoMo transactions only.
  // Corporate MoMo transactions (organizationId set, no user/plan) surface
  // in /admin/corporate instead.
  const transactions = await prisma.paymentTransaction.findMany({
    where: { method: "MOMO", status: "VERIFYING", organizationId: null },
    include: {
      user: { select: { name: true, email: true } },
      plan: { select: { name: true, tier: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Note: momoTransactionRef and momoPhoneNumber are returned UNMASKED here —
  // the admin reviewing this exact queue needs the full values to cross-check
  // against the MTN MoMo merchant dashboard; masking them would make manual
  // verification impossible. Only the patient's email is minimized, since
  // it isn't needed to perform the verification itself.
  const rows = transactions
    .filter((t) => t.user && t.plan)
    .map((t) => ({
      id: t.id,
      createdAt: t.createdAt,
      userName: t.user!.name,
      userEmail: maskEmail(t.user!.email),
      planName: t.plan!.name,
      tier: t.plan!.tier,
      amountCents: t.amountCents,
      currency: t.currency,
      momoTransactionRef: t.momoTransactionRef,
      momoPhoneNumber: t.momoPhoneNumber,
    }));

  return NextResponse.json(rows);
}
