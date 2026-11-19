import { randomBytes, createHash } from "crypto";
import { z } from "zod";
import { apiSuccess, handle, readJson, validateBody } from "@/lib/api";
import { sendVerificationEmail } from "@/lib/email";
import { getClientIp } from "@/lib/getClientIp";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";

const schema = z.object({ email: z.email() });

export async function POST(req: Request) {
  return handle(async () => {
    const ip = getClientIp(req.headers);
    const limit = enforceRateLimit(`auth-resend-verification:${ip}`, 5, 15 * 60_000);
    if (limit) return limit;

    const parsed = validateBody(await readJson(req), schema, "A valid email is required.");
    if (!parsed.ok) return parsed.response;

    const cleanEmail = parsed.data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    // Always return 200 — never reveal whether an email is registered.
    if (!user) {
      return apiSuccess({ message: "ok" });
    }

    if (user.isEmailVerified) {
      // Account is already active; don't send a spurious email.
      return apiSuccess({ message: "ok" });
    }

    // Rotate: delete any outstanding tokens, issue a fresh one.
    await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.emailVerificationToken.create({
      data: { tokenHash, userId: user.id, expiresAt },
    });

    const verifyUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${rawToken}`;

    try {
      await sendVerificationEmail({ to: user.email, name: user.name, verifyUrl });
    } catch (emailErr) {
      logger.error({ event: "resend_verification_email_error", err: emailErr }, "Resend verification email error");
    }

    return apiSuccess({ message: "ok" });
  });
}
