import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/getClientIp";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

// Public — the HR contact submitting this has no NauriCare account. Nothing
// activates from this call alone: it only moves the transaction into
// VERIFYING for an admin to confirm against the MTN MoMo merchant dashboard,
// exactly like the individual submit-ref flow.
const submitCorporateRefSchema = z.object({
  organizationId: z.string().min(1),
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
  const ip = getClientIp(req.headers);
  const limit = rateLimit(`corporate-momo-submit:${ip}`, 5, 15 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = submitCorporateRefSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { organizationId, referenceCode, phoneNumber } = parsed.data;

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { subscription: true },
    });
    if (!organization || !organization.subscription) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }
    if (organization.subscription.paymentMethod !== "MOMO") {
      return NextResponse.json({ error: "This organization did not select MoMo as its payment method." }, { status: 400 });
    }
    if (organization.subscription.status !== "VERIFYING") {
      return NextResponse.json(
        { error: `This subscription is already ${organization.subscription.status.toLowerCase()}.` },
        { status: 409 },
      );
    }

    // Insert directly and rely on the DB's unique constraint on
    // momoTransactionRef to reject duplicates atomically.
    const transaction = await prisma.paymentTransaction.create({
      data: {
        organizationId: organization.id,
        corporateSubscriptionId: organization.subscription.id,
        method: "MOMO",
        status: "VERIFYING",
        amountCents: Math.round(organization.subscription.totalContractValue * 100),
        currency: "USD",
        momoTransactionRef: referenceCode,
        momoPhoneNumber: phoneNumber,
      },
    });

    await prisma.auditEvent.create({
      data: {
        userId: null,
        action: "CORPORATE_MOMO_REF_SUBMITTED",
        details: { transactionId: transaction.id, organizationId: organization.id },
      },
    });

    return NextResponse.json(
      {
        transactionId: transaction.id,
        status: transaction.status,
        message: "Your reference code has been submitted for verification. Our team will confirm within one business day.",
      },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This reference code has already been submitted." }, { status: 409 });
    }
    console.error("[CORPORATE_MOMO_SUBMIT_ERROR]", error);
    return NextResponse.json({ error: "Failed to submit reference code." }, { status: 500 });
  }
}
