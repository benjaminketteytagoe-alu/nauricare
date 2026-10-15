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
      include: { plan: true },
    });

    // This endpoint handles individual MoMo transactions only — corporate
    // MoMo payments (organizationId set, no user/plan) go through
    // /api/admin/corporate instead.
    if (
      !transaction ||
      transaction.method !== "MOMO" ||
      transaction.organizationId ||
      !transaction.userId ||
      !transaction.planId ||
      !transaction.plan
    ) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (transaction.status !== "VERIFYING") {
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
        targetId: transaction.userId,
        details: { transactionId: transaction.id, reason: reason || "Rejected by admin review" },
      });

      return NextResponse.json({ success: true, status: "FAILED" });
    }

    // APPROVE — activate the subscription and complete the transaction atomically.
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + transaction.plan.billingPeriodMonths);

    await prisma.$transaction([
      prisma.paymentTransaction.update({
        where: { id },
        data: { status: "COMPLETED", verifiedByAdminId: session.user.id, verifiedAt: now },
      }),
      prisma.subscription.upsert({
        where: { userId: transaction.userId },
        create: {
          userId: transaction.userId,
          planId: transaction.planId,
          tier: transaction.plan.tier,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        update: {
          planId: transaction.planId,
          tier: transaction.plan.tier,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      }),
    ]);

    // Link the transaction to the now-existing subscription (separate write —
    // Subscription.id isn't known until the upsert above resolves).
    const subscription = await prisma.subscription.findUnique({ where: { userId: transaction.userId } });
    if (subscription) {
      await prisma.paymentTransaction.update({ where: { id }, data: { subscriptionId: subscription.id } });
    }

    await logAdministrativeAction({
      action: "PAYMENT_VERIFIED",
      actorId: session.user.id,
      targetId: transaction.userId,
      details: { transactionId: transaction.id, planId: transaction.planId, tier: transaction.plan.tier },
    });

    return NextResponse.json({ success: true, status: "COMPLETED" });
  } catch (error) {
    console.error("[MOMO_VERIFY_ERROR]", error);
    return NextResponse.json({ error: "Failed to process verification." }, { status: 500 });
  }
}
