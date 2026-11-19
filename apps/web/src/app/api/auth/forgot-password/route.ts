import { randomBytes, createHash } from "crypto";
import { z } from "zod";
import { apiError, apiSuccess, handle, readJson } from "@/lib/api";
import { sendPasswordResetEmail } from "@/lib/email";
import { getClientIp } from "@/lib/getClientIp";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";
import { verifyTurnstileToken } from "@/lib/turnstile";

const schema = z.object({
  email: z.string().email(),
  turnstileToken: z.string().min(1, "Security verification required"),
});

export async function POST(req: Request) {
  return handle(async () => {
    const ip = getClientIp(req.headers);
    const limit = enforceRateLimit(`auth-forgot-password:${ip}`, 5, 15 * 60_000);
    if (limit) return limit;

    const body = (await readJson(req)) as Record<string, unknown> | undefined;

    const isHuman = await verifyTurnstileToken(typeof body?.turnstileToken === "string" ? body.turnstileToken : "", ip);
    if (!isHuman) {
      return apiError("Security verification failed. Please try again.", 403);
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Valid email required", 400);
    }

    const { email } = parsed.data; // turnstileToken already verified above

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return 200 to prevent email enumeration attacks
    if (!user) {
      return apiSuccess({ message: "If an account exists, a reset link has been sent." });
    }

    // Delete any existing tokens for this user to prevent token accumulation
    await prisma.resetToken.deleteMany({ where: { userId: user.id } });

    // Generate a cryptographically secure token
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.resetToken.create({
      data: { tokenHash, userId: user.id, expiresAt },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${rawToken}`;

    // Never let a Resend failure change this route's response shape — doing so would
    // let an attacker distinguish real accounts (email fails differently) from fake
    // ones, defeating the anti-enumeration guarantee above.
    try {
      await sendPasswordResetEmail({ to: email, resetUrl });
    } catch (resendError) {
      logger.error({ event: "password_reset_email_error", err: resendError }, "Password reset email error");
    }

    return apiSuccess({ message: "If an account exists, a reset link has been sent." });
  });
}
