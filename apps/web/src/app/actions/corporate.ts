"use server";

import { headers } from "next/headers";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import {
  calculateCorporatePricing,
  centsToDollars,
  MIN_CORPORATE_SEATS,
  type CorporatePricingResult,
} from "@/lib/corporatePricing";
import { getClientIp } from "@/lib/getClientIp";
import { rateLimit } from "@/lib/rateLimit";
import { logAdministrativeAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const createCorporateAccountSchema = z.object({
  organizationName: z.string().trim().min(2, "Organization name is required").max(150),
  corporateEmailDomain: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => v.replace(/^@/, ""))
    .pipe(z.string().regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/, "Enter a valid domain, e.g. company.rw")),
  contactPersonName: z.string().trim().min(2, "Contact name is required").max(100),
  contactEmail: z.email(),
  contactPhone: z.string().trim().max(30).optional(),
  seats: z
    .number()
    .int()
    .min(MIN_CORPORATE_SEATS, `Minimum ${MIN_CORPORATE_SEATS} seats`)
    .max(100_000, "For headcounts this large, contact sales directly"),
  billingCycle: z.enum(["MONTHLY", "ANNUAL"]),
  paymentMethod: z.enum(["MOMO", "STRIPE", "INVOICE_WIRE"]),
});

export type CreateCorporateAccountInput = z.infer<typeof createCorporateAccountSchema>;

type CreateCorporateAccountResult =
  | { success: false; error: string }
  | { success: true; organizationId: string; checkoutUrl: string; pricing: CorporatePricingResult }
  | { success: true; organizationId: string; transactionId: string; pricing: CorporatePricingResult }
  | { success: true; organizationId: string; pricing: CorporatePricingResult };

/**
 * Public lead-intake action — an HR contact filling out the pricing page CTA
 * has no NauriCare account yet, so this deliberately does not require a
 * session. Rate-limited by IP since it writes real DB rows and (for Stripe)
 * calls out to a paid API.
 */
export async function createCorporateAccount(
  input: CreateCorporateAccountInput,
): Promise<CreateCorporateAccountResult> {
  const ip = getClientIp(await headers());
  const limit = rateLimit(`corporate-signup:${ip}`, 5, 30 * 60_000);
  if (!limit.allowed) {
    return { success: false as const, error: "Too many requests. Please try again in a few minutes." };
  }

  const parsed = createCorporateAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const existingOrg = await prisma.organization.findUnique({
    where: { corporateEmailDomain: data.corporateEmailDomain },
    select: { id: true },
  });
  if (existingOrg) {
    return { success: false as const, error: "This company domain is already registered with NauriCare Corporate Care." };
  }

  // Server-side authoritative pricing — the seat count and billing cycle are
  // the only client inputs; the per-seat rate and totals are never trusted
  // from the client.
  const pricing = calculateCorporatePricing(data.seats, data.billingCycle);

  try {
    const { organization, subscription } = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: data.organizationName,
          corporateEmailDomain: data.corporateEmailDomain,
          contactPersonName: data.contactPersonName,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone || null,
          allocatedSeats: data.seats,
        },
      });

      const subscription = await tx.corporateSubscription.create({
        data: {
          organizationId: organization.id,
          tier: pricing.tier,
          billingCycle: data.billingCycle,
          pricePerSeatMonth: centsToDollars(pricing.pricePerSeatMonthCents),
          totalContractValue: centsToDollars(pricing.totalContractCents),
          paymentMethod: data.paymentMethod,
        },
      });

      return { organization, subscription };
    });

    await prisma.auditEvent.create({
      data: {
        userId: null,
        action: "CORPORATE_ACCOUNT_CREATED",
        details: {
          organizationId: organization.id,
          domain: data.corporateEmailDomain,
          tier: pricing.tier,
          seats: data.seats,
          paymentMethod: data.paymentMethod,
        },
      },
    });

    // Stripe: create the checkout session now and return a redirect URL.
    if (data.paymentMethod === "STRIPE") {
      if (!process.env.STRIPE_SECRET_KEY) {
        return { success: false as const, error: "Card payments are not configured on this server." };
      }

      const transaction = await prisma.paymentTransaction.create({
        data: {
          organizationId: organization.id,
          corporateSubscriptionId: subscription.id,
          method: "STRIPE",
          status: "PENDING",
          amountCents: pricing.totalContractCents,
          currency: "USD",
        },
      });

      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: pricing.totalContractCents,
              product_data: {
                name: `NauriCare Corporate Care — ${pricing.tier} (${data.seats} seats, ${data.billingCycle.toLowerCase()})`,
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/corporate/pricing?checkout=success`,
        cancel_url: `${baseUrl}/corporate/pricing?checkout=cancelled`,
        customer_email: data.contactEmail,
        metadata: {
          organizationId: organization.id,
          corporateSubscriptionId: subscription.id,
          transactionId: transaction.id,
        },
      });

      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: { stripeSessionId: checkoutSession.id },
      });

      if (!checkoutSession.url) {
        return { success: false as const, error: "Failed to create checkout session." };
      }

      return { success: true as const, organizationId: organization.id, checkoutUrl: checkoutSession.url, pricing };
    }

    // Invoice/wire: no reference-code step — the transaction sits PENDING
    // until an admin manually confirms funds received.
    if (data.paymentMethod === "INVOICE_WIRE") {
      const transaction = await prisma.paymentTransaction.create({
        data: {
          organizationId: organization.id,
          corporateSubscriptionId: subscription.id,
          method: "INVOICE_WIRE",
          status: "PENDING",
          amountCents: pricing.totalContractCents,
          currency: "USD",
        },
      });
      return { success: true as const, organizationId: organization.id, transactionId: transaction.id, pricing };
    }

    // MoMo: the HR contact submits the actual reference code via
    // POST /api/payments/corporate/momo, which creates the transaction.
    return { success: true as const, organizationId: organization.id, pricing };
  } catch (error) {
    console.error("[CREATE_CORPORATE_ACCOUNT_ERROR]", error);
    return { success: false as const, error: "Failed to create corporate account." };
  }
}

const updateSeatAllocationSchema = z.object({
  organizationId: z.string().min(1),
  allocatedSeats: z.number().int().min(MIN_CORPORATE_SEATS),
});

/** NauriCare-admin-only — HR teams request seat changes through sales; an admin applies them here. */
export async function updateSeatAllocation(input: z.infer<typeof updateSeatAllocationSchema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false as const, error: "Unauthorized" };
  }

  const parsed = updateSeatAllocationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  const org = await prisma.organization.findUnique({ where: { id: parsed.data.organizationId } });
  if (!org) return { success: false as const, error: "Organization not found" };

  if (parsed.data.allocatedSeats < org.usedSeats) {
    return {
      success: false as const,
      error: `Cannot set allocated seats below the ${org.usedSeats} seats currently in use.`,
    };
  }

  await prisma.organization.update({
    where: { id: org.id },
    data: { allocatedSeats: parsed.data.allocatedSeats },
  });

  await logAdministrativeAction({
    action: "ADMIN_SETTINGS_UPDATE",
    actorId: session.user.id,
    targetId: org.id,
    details: { organizationId: org.id, previousSeats: org.allocatedSeats, newSeats: parsed.data.allocatedSeats },
  });

  revalidatePath("/admin/corporate");
  return { success: true as const };
}
