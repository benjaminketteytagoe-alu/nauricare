import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { getClientIp } from "@/lib/getClientIp";

const schema = z.object({
  email: z.string().email(),
  turnstileToken: z.string().min(1, "Security verification required"),
});

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

    const { email } = parsed.data; // turnstileToken already verified above

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return 200 to prevent email enumeration attacks
    if (!user) {
      return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
    }

    // Delete any existing tokens for this user to prevent token accumulation
    await prisma.resetToken.deleteMany({ where: { userId: user.id } });

    // Generate a cryptographically secure token
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.resetToken.create({
      data: { tokenHash, userId: user.id, expiresAt },
    });

    // In production this would send an email via SendGrid/Resend/etc.
    // The reset link would be: ${process.env.NEXTAUTH_URL}/reset-password?token=${rawToken}
    console.log(`[PASSWORD RESET] Token for ${email}: ${rawToken}`);
    console.log(`[PASSWORD RESET] Reset URL: ${process.env.NEXTAUTH_URL}/reset-password?token=${rawToken}`);

    return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
  } catch (error) {
    console.error("[FORGOT_PASSWORD_ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
