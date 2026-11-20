import bcrypt from "bcryptjs";
import { z } from "zod";
import { apiError, apiSuccess, handle, parseJson } from "@/lib/api";
import { logAdministrativeAction } from "@/lib/audit";
import { requireApiUser } from "@/lib/auth-guards";
import { getClientIp } from "@/lib/getClientIp";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";
import { passwordField } from "@/lib/validation/password";
import { geocodePractice } from "@/server/geo/geocode";

const onboardProviderSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().trim(),
  password: passwordField,
  specialty: z.string().trim().min(2).max(100),
  location: z.string().trim().min(1).max(200),
  // Required — PractitionerProfile.clinicName is a non-nullable DB column.
  clinicName: z.string().trim().min(1, "Clinic name is required").max(150),
});

// Fetch all providers
export async function GET() {
  const auth = await requireApiUser("ADMIN");
  if (!auth.ok) return auth.response;
  return handle(async () => {
    // select (not include) — an unscoped include on User pulls every scalar
    // field, including passwordHash, straight into the JSON response.
    const providers = await prisma.user.findMany({
      where: { role: "PROVIDER" },
      select: {
        id: true,
        name: true,
        email: true,
        isVerified: true,
        createdAt: true,
        practitionerProfile: {
          select: { specialty: true, clinicName: true, location: true, isVerified: true, isActive: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(providers);
  });
}

// EXISTING: Create a new provider
export async function POST(req: Request) {
  const auth = await requireApiUser("ADMIN");
  if (!auth.ok) return auth.response;
  const limited = enforceRateLimit(`admin-providers:${auth.user.id}`, 30, 60 * 60_000);
  if (limited) return limited;
  const parsed = await parseJson(req, onboardProviderSchema);
  if (!parsed.ok) return parsed.response;
  const { name, email, password, specialty, location, clinicName } = parsed.data;

  return handle(async () => {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return apiError("User already exists", 400);

    const passwordHash = await bcrypt.hash(password, 10);
    // Coordinates for the patient map (best effort; never blocks onboarding).
    const coords = await geocodePractice(location, clinicName);

    // select (not include) — see GET above: an unscoped include on User
    // returns passwordHash straight into the JSON response.
    const newProvider = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "PROVIDER",
        isVerified: true,
        practitionerProfile: {
          create: {
            specialty,
            location,
            clinicName,
            latitude: coords?.lat ?? null,
            longitude: coords?.lng ?? null,
            isVerified: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        isVerified: true,
        practitionerProfile: {
          select: { specialty: true, clinicName: true, location: true, isVerified: true, isActive: true },
        },
      },
    });

    await logAdministrativeAction({
      action: "PROVIDER_REGISTER",
      actorId: auth.user.id,
      targetId: newProvider.id,
      details: { via: "admin-onboard", providerEmail: newProvider.email },
      ipAddress: getClientIp(req.headers),
    });

    return apiSuccess(newProvider, 201);
  });
}
