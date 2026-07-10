import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { getClientIp } from "@/lib/getClientIp";
import { passwordField } from "@/lib/validation/password";
import { sendVerificationEmail } from "@/lib/email";

const privacyField = z.boolean().refine((v) => v === true, {
  message: "You must consent to the privacy policy",
});

// E.164: + followed by 7–15 digits (no spaces/dashes/parens)
const phoneField = z
  .string()
  .min(1, "Phone number is required")
  .refine((v) => /^\+\d{7,15}$/.test(v), {
    message: "Invalid phone number — expected E.164 format (e.g. +250788123456)",
  });

const patientSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: passwordField,
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  privacyConsent: privacyField,
  role: z.literal("PATIENT"),
  country: z.string().min(1, "Country is required"),
  phoneNumber: phoneField,
});

const providerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: passwordField,
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  privacyConsent: privacyField,
  role: z.literal("PROVIDER"),
  specialty: z.string().min(2).max(100),
  clinicName: z.string().min(2).max(150),
  location: z.string().min(2).max(200),
  country: z.string().min(1, "Country is required"),
  phoneNumber: phoneField,
});

const registerSchema = z.discriminatedUnion("role", [patientSchema, providerSchema]);

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

    // Sanitize phone before validation — strip spaces, dashes, parens that a
    // browser tel input might insert between the prefix and local number.
    if (typeof body?.phoneNumber === "string") {
      body.phoneNumber = body.phoneNumber.replace(/[\s\-\(\)]/g, "");
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json({ error: firstError.message }, { status: 400 });
    }

    const data = parsed.data;

    const dobDate = new Date(data.dateOfBirth);
    if (isNaN(dobDate.getTime())) {
      return NextResponse.json({ error: "Invalid date of birth" }, { status: 400 });
    }

    const ageDifMs = Date.now() - dobDate.getTime();
    const age = Math.floor(ageDifMs / (1000 * 60 * 60 * 24 * 365.25));
    if (age < 18) {
      return NextResponse.json({ error: "You must be at least 18 years old to register." }, { status: 403 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    // Phone number uniqueness check — @unique constraint on User.phoneNumber
    const existingPhone = await prisma.user.findUnique({ where: { phoneNumber: data.phoneNumber } });
    if (existingPhone) {
      return NextResponse.json({ error: "An account with this phone number already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    // Raw token only ever exists in the verification link — the DB stores a SHA-256
    // hash, mirroring the ResetToken pattern used by the password-reset flow.
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const userWithoutPassword = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash,
          dateOfBirth: dobDate,
          privacyConsent: true,
          role: data.role,
          country: data.country,
          phoneNumber: data.phoneNumber,
        },
      });

      if (data.role === "PATIENT") {
        await tx.patientProfile.create({
          data: {
            userId: newUser.id,
            country: data.country,
          },
        });
      } else {
        await tx.practitionerProfile.create({
          data: {
            userId: newUser.id,
            specialty: data.specialty,
            location: data.location,
            clinicName: data.clinicName,
          },
        });
      }

      await tx.emailVerificationToken.create({
        data: { tokenHash, userId: newUser.id, expiresAt },
      });

      return {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        createdAt: newUser.createdAt,
      };
    });

    const verifyUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${rawToken}`;

    // Never let an email failure roll back or fail a successful registration —
    // the account already exists; the user can request a fresh link if needed.
    try {
      await sendVerificationEmail({
        to: userWithoutPassword.email,
        name: userWithoutPassword.name,
        verifyUrl,
      });
    } catch (emailError) {
      console.error("[VERIFICATION_EMAIL_ERROR]", emailError);
    }

    return NextResponse.json(
      { message: "User registered successfully", user: userWithoutPassword },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    );
  }
}
