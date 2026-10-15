import Stripe from "stripe";

// Falls back to a dummy key at build/import time so `next build` (which
// imports every route file to type-check/bundle it) never fails on a
// missing secret — mirrors the Resend client pattern in src/lib/email.ts.
// A real STRIPE_SECRET_KEY is required at runtime for any of this to work.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy_key_for_build", {
  apiVersion: "2026-07-29.dahlia",
});

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
