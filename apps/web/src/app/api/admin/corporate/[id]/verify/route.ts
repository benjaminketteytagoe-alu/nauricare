import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { logAdministrativeAction } from "@/lib/audit";

const verifySchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().max(500).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// [id] is the PaymentTransaction id (matches the individual MoMo verify
// route's convention) — an org's corporateSubscriptionId is already set on
// the transaction at creation time, so approval here doesn't need the
// two-step "create then link" the individual flow uses.
export async function POST(req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { action, reason } = parsed.data;

  try {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id },
      include: { corporateSubscription: true },
    });

    if (!transaction || !transaction.organizationId || !transaction.corporateSubscription) {
      return NextResponse.json({ error: "Corporate transaction not found" }, { status: 404 });
    }
    if (transaction.status !== "PENDING" && transaction.status !== "VERIFYING") {
      return NextResponse.json(
        { error: `Transaction is already ${transaction.status.toLowerCase()} and cannot be re-reviewed.` },
        { status: 409 },
      );
    }

    const now = new Date();

    if (action === "REJECT") {
      await prisma.paymentTransaction.update({
        where: { id },
        data: {
          status: "FAILED",
          verifiedByAdminId: session.user.id,
          verifiedAt: now,
          failureReason: reason || "Rejected by admin review",
        },
      });

      await logAdministrativeAction({
        action: "PAYMENT_REJECTED",
        actorId: session.user.id,
        targetId: transaction.organizationId,
        details: { transactionId: transaction.id, organizationId: transaction.organizationId, reason: reason || "Rejected by admin review" },
      });

      return NextResponse.json({ success: true, status: "FAILED" });
    }

    // APPROVE — activate the corporate subscription and complete the transaction atomically.
    const months = transaction.corporateSubscription.billingCycle === "ANNUAL" ? 12 : 1;
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + months);

    await prisma.$transaction([
      prisma.paymentTransaction.update({
        where: { id },
        data: { status: "COMPLETED", verifiedByAdminId: session.user.id, verifiedAt: now },
      }),
      prisma.corporateSubscription.update({
        where: { id: transaction.corporateSubscription.id },
        data: { status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: periodEnd },
      }),
    ]);

    await logAdministrativeAction({
      action: "PAYMENT_VERIFIED",
      actorId: session.user.id,
      targetId: transaction.organizationId,
      details: {
        transactionId: transaction.id,
        organizationId: transaction.organizationId,
        tier: transaction.corporateSubscription.tier,
      },
    });

    return NextResponse.json({ success: true, status: "COMPLETED" });
  } catch (error) {
    console.error("[CORPORATE_VERIFY_ERROR]", error);
    return NextResponse.json({ error: "Failed to process verification." }, { status: 500 });
  }
}
