import "server-only";
import { prisma } from "@/lib/prisma";
import { openJson, sealJson } from "@/server/security/sealing";

// Sign-up hands the browser a short-lived, encrypted ticket so it can sign in
// straight away instead of typing the password (and solving Turnstile) again.
//
// A ticket only opens the *pending* session: the emailed 6-digit code is still
// required before the session carries a user id, and entering that code is
// what marks the email as verified. A ticket stops working once the email is
// verified or the account is older than the ticket lifetime, so a leaked
// ticket is worth no more than the password the person just typed.

const PURPOSE = "signup-ticket";
const TICKET_TTL_MS = 10 * 60_000;

interface Ticket {
  uid: string;
  exp: number;
}

export function issueSignupTicket(userId: string): string {
  return sealJson(PURPOSE, { uid: userId, exp: Date.now() + TICKET_TTL_MS } satisfies Ticket);
}

/** The new, still-unverified account a ticket was issued for, or null. */
export async function redeemSignupTicket(ticket: string) {
  const t = openJson<Ticket>(PURPOSE, ticket);
  if (!t || typeof t.uid !== "string" || typeof t.exp !== "number" || t.exp < Date.now()) return null;
  const user = await prisma.user.findUnique({
    where: { id: t.uid },
    select: { id: true, name: true, email: true, role: true, isEmailVerified: true, deletedAt: true, createdAt: true },
  });
  if (!user || user.deletedAt || user.isEmailVerified) return null;
  if (Date.now() - user.createdAt.getTime() > TICKET_TTL_MS) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
