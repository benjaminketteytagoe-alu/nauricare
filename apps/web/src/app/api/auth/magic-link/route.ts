import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { getClientIp } from "@/lib/getClientIp";
import { sendMagicLinkEmail } from "@/lib/email";

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
  try {
    const body = await req.json();

    const isHuman = await verifyTurnstileToken(
      body?.turnstileToken ?? "",
      getClientIp(req.headers as Headers),
    );
    if (!isHuman) {
      return NextResponse.json(
        { error: "Security verification failed. Please try again." },
        { status: 403 },
      );
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return the same response whether or not the account exists —
    // mirrors the anti-enumeration pattern in forgot-password.
    if (user) {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256")
        .update(`${rawToken}${process.env.NEXTAUTH_SECRET}`)
        .digest("hex");
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
        console.error("[MAGIC_LINK_EMAIL_ERROR]", emailError);
      }
    }

    return NextResponse.json({ message: "If an account exists, a login link has been sent." });
  } catch (error) {
    console.error("[MAGIC_LINK_ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
