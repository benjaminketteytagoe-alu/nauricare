import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// The reminder idempotency ledger (ReminderDispatch). Flow per reminder:
//   claim(key)  - atomic: a new key, a FAILED one, or an abandoned CLAIMED
//                 lease (> 15 min). Already-SENT or busy keys return null.
//   deliver()   - runs each step (in-app, email) that hasn't succeeded yet,
//                 recording it, then marks the row SENT. Any failure marks it
//                 FAILED for the next run; steps already done are skipped.
// Emails carry the dedupe key as a Resend idempotency key, so even a crash
// between "provider accepted" and "row updated" can't send twice.

export const LEASE_MS = 15 * 60_000;
export const MAX_ATTEMPTS = 5;

export type Claim = { id: string; dedupeKey: string; notifiedAt: Date | null; emailedAt: Date | null };
const CLAIM_SELECT = { id: true, dedupeKey: true, notifiedAt: true, emailedAt: true } as const;

export async function claim(dedupeKey: string, kind: string, userId: string): Promise<Claim | null> {
  try {
    return await prisma.reminderDispatch.create({ data: { dedupeKey, kind, userId }, select: CLAIM_SELECT });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
  }
  const { count } = await prisma.reminderDispatch.updateMany({
    where: {
      dedupeKey,
      attempts: { lt: MAX_ATTEMPTS },
      OR: [{ status: "FAILED" }, { status: "CLAIMED", claimedAt: { lt: new Date(Date.now() - LEASE_MS) } }],
    },
    data: { status: "CLAIMED", claimedAt: new Date(), attempts: { increment: 1 } },
  });
  return count ? prisma.reminderDispatch.findUnique({ where: { dedupeKey }, select: CLAIM_SELECT }) : null;
}

export interface Steps {
  notify?: () => Promise<void>;
  email?: (idempotencyKey: string) => Promise<void>;
}

/** Deliver the remaining steps for a claim. True when the reminder is fully SENT. */
export async function deliver(c: Claim, steps: Steps): Promise<boolean> {
  try {
    if (steps.notify && !c.notifiedAt) {
      await steps.notify();
      await prisma.reminderDispatch.update({ where: { id: c.id }, data: { notifiedAt: new Date() } });
    }
    if (steps.email && !c.emailedAt) {
      await steps.email(`reminder/${c.dedupeKey}`.slice(0, 256));
      await prisma.reminderDispatch.update({ where: { id: c.id }, data: { emailedAt: new Date() } });
    }
    await prisma.reminderDispatch.update({ where: { id: c.id }, data: { status: "SENT", sentAt: new Date(), lastError: null } });
    return true;
  } catch (e) {
    const message = (e instanceof Error ? e.message : String(e)).slice(0, 300);
    await prisma.reminderDispatch.update({ where: { id: c.id }, data: { status: "FAILED", lastError: message } }).catch(() => {});
    console.error(`[REMINDER] ${c.dedupeKey} failed:`, message);
    return false;
  }
}
