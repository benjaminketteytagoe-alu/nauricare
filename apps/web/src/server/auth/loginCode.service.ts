import { randomInt, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/api";
import { sendLoginCodeEmail } from "@/lib/email";
import { hashToken, keyedHash } from "@/server/security/sealing";

// Second sign-in step: a 6-digit code emailed after every sign-in (password,
// Google or email link). Until it is entered the session carries no user id,
// so every guard treats it as signed out (see the NextAuth callbacks).
//
// Codes: 10-minute lifetime, 5 attempts, stored only as an HMAC, bound to
// the browser session that requested them. Sending is rate-limited.

export const CODE_TTL_MS = 10 * 60_000;
export const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 45_000;
const MAX_SENDS_PER_HOUR = 10;
const UNLOCK_WINDOW_MS = 5 * 60_000; // a verified code must be used to unlock within 5 minutes

const sessionKey = (sid: string) => hashToken(`login-session:${sid}`);
const codeHash = (challengeId: string, code: string) => keyedHash("login-code", `${challengeId}:${code}`);

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "your email";
  return `${local.slice(0, 2)}${"•".repeat(Math.max(1, Math.min(6, local.length - 2)))}@${domain}`;
}

/** Create a fresh code for this session and email it. Previous unused codes stop working. */
export async function sendLoginCode(userId: string, sid: string, ipAddress?: string | null): Promise<{ maskedEmail: string; expiresAt: Date }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true, deletedAt: true } });
  if (!user || user.deletedAt) throw new ServiceError("Account not found.", 404);

  const key = sessionKey(sid);
  const recent = await prisma.loginChallenge.findMany({
    where: { userId, createdAt: { gt: new Date(Date.now() - 3_600_000) } },
    select: { createdAt: true, sessionKeyHash: true },
    orderBy: { createdAt: "desc" },
  });
  // Cooldown per session (a fresh sign-in elsewhere still gets a code at once);
  // the hourly cap is per account, against email bombing.
  const lastHere = recent.find((c) => c.sessionKeyHash === key);
  if (lastHere && Date.now() - lastHere.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - lastHere.createdAt.getTime())) / 1000);
    throw new ServiceError(`Please wait ${wait} seconds before requesting another code.`, 429);
  }
  if (recent.length >= MAX_SENDS_PER_HOUR) throw new ServiceError("Too many codes requested. Please try again in an hour.", 429);

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  const challenge = await prisma.$transaction(async (tx) => {
    await tx.loginChallenge.updateMany({ where: { userId, sessionKeyHash: key, verifiedAt: null, expiresAt: { gt: new Date() } }, data: { expiresAt: new Date() } });
    const c = await tx.loginChallenge.create({ data: { userId, sessionKeyHash: key, codeHash: "pending", expiresAt, ipAddress: ipAddress ?? null } });
    return tx.loginChallenge.update({ where: { id: c.id }, data: { codeHash: codeHash(c.id, code) } });
  });

  // Local development only (never in production): print the code instead of
  // relying on email, so the flow can be tested without a real Resend key.
  const devLog = process.env.NODE_ENV !== "production" && process.env.LOGIN_CODE_DEV_LOG === "1";
  if (devLog) console.log(`[LOGIN_CODE_DEV] ${user.email} ${code}`);
  try {
    await sendLoginCodeEmail({ to: user.email, name: user.name.split(" ")[0] || "there", code, minutes: CODE_TTL_MS / 60_000 });
  } catch (e) {
    console.error("[LOGIN_CODE_EMAIL]", e instanceof Error ? e.message : e);
    if (!devLog) {
      await prisma.loginChallenge.update({ where: { id: challenge.id }, data: { expiresAt: new Date() } });
      throw new ServiceError("We couldn't send your code. Please try again in a moment.", 502);
    }
  }
  return { maskedEmail: maskEmail(user.email), expiresAt };
}

/** Check a code for this session. Wrong codes count towards the attempt limit. */
export async function verifyLoginCode(userId: string, sid: string, code: string): Promise<void> {
  if (!/^\d{6}$/.test(code)) throw new ServiceError("Enter the 6-digit code from your email.", 400);
  const challenge = await prisma.loginChallenge.findFirst({
    where: { userId, sessionKeyHash: sessionKey(sid), verifiedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) throw new ServiceError("This code has expired. Request a new one.", 410);

  const expected = Buffer.from(challenge.codeHash);
  const given = Buffer.from(codeHash(challenge.id, code));
  const match = expected.length === given.length && timingSafeEqual(expected, given);
  if (!match) {
    const updated = await prisma.loginChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
    const left = MAX_ATTEMPTS - updated.attempts;
    throw new ServiceError(left > 0 ? `That code isn't right. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many wrong attempts. Request a new code.", left > 0 ? 400 : 429);
  }
  // Conditional update: a code can be verified exactly once.
  const { count } = await prisma.loginChallenge.updateMany({ where: { id: challenge.id, verifiedAt: null }, data: { verifiedAt: new Date() } });
  if (count === 0) throw new ServiceError("This code has already been used.", 410);
}

/**
 * Called from the NextAuth jwt callback when the client asks to unlock the
 * session. True once per verified challenge for this session (atomic consume).
 */
export async function consumeVerifiedLogin(userId: string, sid: string): Promise<boolean> {
  const challenge = await prisma.loginChallenge.findFirst({
    where: { userId, sessionKeyHash: sessionKey(sid), verifiedAt: { gt: new Date(Date.now() - UNLOCK_WINDOW_MS) }, consumedAt: null },
    orderBy: { verifiedAt: "desc" },
    select: { id: true },
  });
  if (!challenge) return false;
  const { count } = await prisma.loginChallenge.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { consumedAt: new Date() } });
  return count === 1;
}
