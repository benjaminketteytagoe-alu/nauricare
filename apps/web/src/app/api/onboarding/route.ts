import { z } from "zod";
import { apiSuccess, handle, parseJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";

const OnboardingInput = z.object({
  country: z.string().trim().min(1, "Country is required").max(100),
  menstrualCycle: z.string().trim().max(10).optional().nullable(),
  emergencyContact: z.string().trim().max(200).optional().nullable(),
  dateOfBirth: z.string().max(40).optional().nullable(),
});

// Completes the patient profile after sign-up (Google sign-ins arrive without one).
export async function POST(req: Request) {
  const auth = await requireApiUser("PATIENT");
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;
  const limited = enforceRateLimit(`onboarding:${userId}`, 20, 60 * 60_000);
  if (limited) return limited;
  const body = await parseJson(req, OnboardingInput);
  if (!body.ok) return body.response;
  const { country, menstrualCycle, emergencyContact, dateOfBirth } = body.data;

  // Google sign-ins often have no date of birth; ignore anything unparseable.
  const dob = dateOfBirth ? new Date(dateOfBirth) : null;
  const validDob = dob && !Number.isNaN(dob.getTime()) ? dob : null;

  return handle(async () => {
    if (validDob) await prisma.user.update({ where: { id: userId }, data: { dateOfBirth: validDob } });
    // Upsert keeps double-submits and repeat Google sign-ins idempotent.
    const fields = { country, menstrualCycle: menstrualCycle || null, emergencyContact: emergencyContact || null };
    const profile = await prisma.patientProfile.upsert({
      where: { userId },
      update: fields,
      create: { userId, ...fields },
    });
    return apiSuccess(profile, 201);
  });
}
