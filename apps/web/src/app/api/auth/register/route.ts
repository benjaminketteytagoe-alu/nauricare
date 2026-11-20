import bcrypt from "bcryptjs";
import { z } from "zod";
import { apiError, apiSuccess, handle, readJson } from "@/lib/api";
import { getClientIp } from "@/lib/getClientIp";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { passwordField } from "@/lib/validation/password";
import { issueSignupTicket } from "@/server/auth/signupTicket";

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
  return handle(async () => {
    const ip = getClientIp(req.headers);
    const limit = enforceRateLimit(`auth-register:${ip}`, 5, 15 * 60_000);
    if (limit) return limit;

    const body = (await readJson(req)) as Record<string, unknown> | undefined;

    const isHuman = await verifyTurnstileToken(typeof body?.turnstileToken === "string" ? body.turnstileToken : "", ip);
    if (!isHuman) {
      return apiError("Security verification failed. Please try again.", 403);
    }

    // Sanitize phone before validation — strip spaces, dashes, parens that a
    // browser tel input might insert between the prefix and local number.
    if (typeof body?.phoneNumber === "string") {
      body.phoneNumber = body.phoneNumber.replace(/[\s\-\(\)]/g, "");
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return apiError(firstError.message, 400);
    }

    const data = parsed.data;

    const dobDate = new Date(data.dateOfBirth);
    if (isNaN(dobDate.getTime())) {
      return apiError("Invalid date of birth", 400);
    }

    const ageDifMs = Date.now() - dobDate.getTime();
    const age = Math.floor(ageDifMs / (1000 * 60 * 60 * 24 * 365.25));
    if (age < 18) {
      return apiError("You must be at least 18 years old to register.", 403);
    }

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      return apiError("An account with this email already exists", 409);
    }

    // Phone number uniqueness check — @unique constraint on User.phoneNumber
    const existingPhone = await prisma.user.findUnique({ where: { phoneNumber: data.phoneNumber } });
    if (existingPhone) {
      return apiError("An account with this phone number already exists", 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

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

      return {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        createdAt: newUser.createdAt,
      };
    });

    // No separate verification email: the browser signs in with this ticket and
    // the emailed sign-in code that follows proves the address (see signupTicket).
    return apiSuccess(
      {
        message: "User registered successfully",
        user: userWithoutPassword,
        signupTicket: issueSignupTicket(userWithoutPassword.id),
      },
      201,
      { "Cache-Control": "no-store" },
    );
  });
}
