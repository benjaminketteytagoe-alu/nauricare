import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

// Note: no `bookingId` field here — NauriCare has no paid-appointment/booking
// concept today. This endpoint is purely for purchasing a subscription Plan;
// `planId` is the thing being paid for.
const submitRefSchema = z.object({
  planId: z.string().min(1, "planId is required"),
  referenceCode: z
    .string()
    .trim()
    .min(4, "Reference code is too short")
    .max(64, "Reference code is too long")
    .regex(/^[A-Za-z0-9-]+$/, "Reference code may only contain letters, numbers, and hyphens"),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{9,15}$/, "Enter a valid phone number")
    .optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Sensitive financial endpoint — 5 submissions per 10 minutes per user.
  const limit = rateLimit(`momo-submit:${session.user.id}`, 5, 10 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = submitRefSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { planId, referenceCode, phoneNumber } = parsed.data;

  try {
    // Server-side price lookup — the client-supplied amount (there isn't
    // one here, deliberately) is never trusted for the charge amount.
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: "Selected plan is not available" }, { status: 400 });
    }

    // Attempt the insert directly and rely on the DB's unique constraint on
    // momoTransactionRef to reject duplicates atomically — a separate
    // "check then insert" would leave a race window for the same code to be
    // submitted twice concurrently.
    const transaction = await prisma.paymentTransaction.create({
      data: {
        userId: session.user.id,
        planId: plan.id,
        method: "MOMO",
        status: "VERIFYING",
        amountCents: plan.priceCents,
        currency: "USD",
        momoTransactionRef: referenceCode,
        momoPhoneNumber: phoneNumber,
      },
    });

    await prisma.auditEvent.create({
      data: {
        userId: session.user.id,
        action: "MOMO_REF_SUBMITTED",
        details: { transactionId: transaction.id, planId: plan.id, tier: plan.tier },
      },
    });

    return NextResponse.json(
      {
        transactionId: transaction.id,
        status: transaction.status,
        message: "Your reference code has been submitted for verification. This usually takes a few minutes.",
      },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "This reference code has already been submitted." },
        { status: 409 },
      );
    }
    console.error("[MOMO_SUBMIT_REF_ERROR]", error);
    return NextResponse.json({ error: "Failed to submit reference code." }, { status: 500 });
  }
}
