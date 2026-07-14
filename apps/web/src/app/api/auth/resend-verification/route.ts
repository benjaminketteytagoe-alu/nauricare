import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes, createHash } from "crypto";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    // Always return 200 — never reveal whether an email is registered.
    if (!user) {
      return NextResponse.json({ message: "ok" });
    }

    if (user.isEmailVerified) {
      // Account is already active; don't send a spurious email.
      return NextResponse.json({ message: "ok" });
    }

    // Rotate: delete any outstanding tokens, issue a fresh one.
    await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });

    const rawToken  = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.emailVerificationToken.create({
      data: { tokenHash, userId: user.id, expiresAt },
    });

    const verifyUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${rawToken}`;

    try {
      await sendVerificationEmail({ to: user.email, name: user.name, verifyUrl });
    } catch (emailErr) {
      console.error("[RESEND_VERIFICATION_EMAIL_ERROR]", emailErr);
    }

    return NextResponse.json({ message: "ok" });
  } catch (err) {
    console.error("[RESEND_VERIFICATION_ERROR]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
