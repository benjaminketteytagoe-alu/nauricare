import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";

// No session/rate-limiting here by design: this endpoint is called by Stripe's
// servers, not a logged-in browser — there is no user session to check, and
// rate-limiting could drop legitimate webhook retries. The Stripe signature
// verification below IS the authentication/anti-abuse control for this route.
export async function POST(req: Request) {
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("[STRIPE_WEBHOOK_ERROR] STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[STRIPE_WEBHOOK_SIGNATURE_ERROR]", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[STRIPE_WEBHOOK_HANDLER_ERROR]", error);
    // Non-2xx so Stripe retries — handler below is idempotent.
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { userId, planId, transactionId } = session.metadata ?? {};
  if (!userId || !planId || !transactionId) {
    console.error("[STRIPE_WEBHOOK_ERROR] Missing metadata on checkout session", session.id);
    return;
  }

  const transaction = await prisma.paymentTransaction.findUnique({ where: { id: transactionId } });
  if (!transaction) {
    console.error("[STRIPE_WEBHOOK_ERROR] No matching transaction for id", transactionId);
    return;
  }

  // Idempotent: Stripe may deliver the same event more than once.
  if (transaction.status === "COMPLETED") return;

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    console.error("[STRIPE_WEBHOOK_ERROR] No matching plan for id", planId);
    return;
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + plan.billingPeriodMonths);

  await prisma.$transaction([
    prisma.paymentTransaction.update({
      where: { id: transactionId },
      data: {
        status: "COMPLETED",
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
      },
    }),
    prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        planId,
        tier: plan.tier,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
      },
      update: {
        planId,
        tier: plan.tier,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
      },
    }),
  ]);

  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  if (subscription) {
    await prisma.paymentTransaction.update({ where: { id: transactionId }, data: { subscriptionId: subscription.id } });
  }

  await prisma.auditEvent.create({
    data: {
      userId,
      action: "STRIPE_CHECKOUT_COMPLETED",
      details: { transactionId, planId, tier: plan.tier, stripeSessionId: session.id },
    },
  });
}
