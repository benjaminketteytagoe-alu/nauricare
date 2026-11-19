import { randomBytes, createHash } from "crypto";
import { z } from "zod";
import { apiError, apiSuccess, handle, readJson } from "@/lib/api";
import { sendMagicLinkEmail } from "@/lib/email";
import { getClientIp } from "@/lib/getClientIp";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";
import { verifyTurnstileToken } from "@/lib/turnstile";

const schema = z.object({
  email: z.string().email(),
  turnstileToken: z.string().min(1, "Security verification required"),
});

// Real send path for the Magic Link flow. NextAuth's own EmailProvider route
// (/api/auth/signin/email) is intentionally left as a no-op in authOptions —
// this route does the actual work after verifying Turnstile, which that native
// route has no hook for. The raw token is hashed exactly the way NextAuth's own
// next-auth/core/lib/utils#hashToken does (sha256 of token + NEXTAUTH_SECRET)
// so the standard /api/auth/callback/email route can verify it normally.
export async function POST(req: Request) {
  return handle(async () => {
    const ip = getClientIp(req.headers);
    const limit = enforceRateLimit(`auth-magic-link:${ip}`, 5, 15 * 60_000);
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

    const email = parsed.data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return the same response whether or not the account exists —
    // mirrors the anti-enumeration pattern in forgot-password.
    if (user) {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(`${rawToken}${process.env.NEXTAUTH_SECRET}`).digest("hex");
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await prisma.verificationToken.create({
        data: { identifier: email, token: tokenHash, expires },
      });

      const callbackUrl = `${process.env.NEXTAUTH_URL}/dashboard`;
      const magicUrl = `${process.env.NEXTAUTH_URL}/api/auth/callback/email?${new URLSearchParams({
        callbackUrl,
        token: rawToken,
        email,
      })}`;

      try {
        await sendMagicLinkEmail({ to: email, url: magicUrl });
      } catch (emailError) {
        logger.error({ event: "magic_link_email_error", err: emailError }, "Magic link email error");
      }
    }

    return apiSuccess({ message: "If an account exists, a login link has been sent." });
  });
}
