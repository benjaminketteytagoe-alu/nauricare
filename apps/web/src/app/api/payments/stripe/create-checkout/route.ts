import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

// Note: no `bookingId` field — see submit-ref/route.ts for why. `planId` is
// the thing being purchased.
const createCheckoutSchema = z.object({
  planId: z.string().min(1, "planId is required"),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(`stripe-checkout:${session.user.id}`, 10, 10 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit);

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Card payments are not configured on this server." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    // Server-side price lookup — never trust a client-supplied amount.
    const plan = await prisma.plan.findUnique({ where: { id: parsed.data.planId } });
    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: "Selected plan is not available" }, { status: 400 });
    }

    // Created up front so the webhook has a row to reconcile against even
    // if the user abandons checkout — it just stays PENDING.
    const transaction = await prisma.paymentTransaction.create({
      data: {
        userId: session.user.id,
        planId: plan.id,
        method: "STRIPE",
        status: "PENDING",
        amountCents: plan.priceCents,
        currency: "USD",
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || new URL(req.url).origin;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: plan.priceCents,
            product_data: { name: `NauriCare ${plan.name} Plan` },
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard/pricing?checkout=success`,
      cancel_url: `${baseUrl}/dashboard/pricing?checkout=cancelled`,
      customer_email: session.user.email ?? undefined,
      metadata: {
        userId: session.user.id,
        planId: plan.id,
        transactionId: transaction.id,
      },
    });

    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { stripeSessionId: checkoutSession.id },
    });

    if (!checkoutSession.url) {
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: 502 });
    }

    return NextResponse.json({ checkoutUrl: checkoutSession.url });
  } catch (error) {
    console.error("[STRIPE_CREATE_CHECKOUT_ERROR]", error);
    return NextResponse.json({ error: "Failed to start checkout." }, { status: 500 });
  }
}
