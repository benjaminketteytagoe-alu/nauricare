import { z } from "zod";
import { apiSuccess, handle, notFound, parseJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";
import { recordActivity } from "@/server/activity/activity.service";

const SettingsInput = z.object({
  healthGoals: z.array(z.string().max(100)).max(20),
  menstrualCycle: z.union([z.string().max(10), z.number()]).optional(),
  emergencyContact: z.string().trim().max(200).optional().nullable(),
});

// The patient's health-profile preferences (Settings page).
export async function GET() {
  const auth = await requireApiUser("PATIENT");
  if (!auth.ok) return auth.response;
  return handle(async () => {
    const profile = await prisma.patientProfile.findUnique({
      where: { userId: auth.user.id },
      include: {
        user: { select: { name: true, email: true, phoneNumber: true, avatarUrl: true, googlePhotoUrl: true } },
      },
    });
    if (!profile) return notFound("Profile not found.");
    return apiSuccess(
      {
        name: profile.user.name,
        email: profile.user.email,
        avatarUrl: profile.user.avatarUrl,
        googlePhotoUrl: profile.user.googlePhotoUrl,
        healthGoals: profile.healthGoals,
        menstrualCycle: profile.menstrualCycle || "28",
        emergencyContact: profile.emergencyContact || "",
      },
      200,
      { "Cache-Control": "private, no-store" },
    );
  });
}

export async function POST(req: Request) {
  const auth = await requireApiUser("PATIENT");
  if (!auth.ok) return auth.response;
  const limited = enforceRateLimit(`settings:${auth.user.id}`);
  if (limited) return limited;
  const body = await parseJson(req, SettingsInput);
  if (!body.ok) return body.response;
  const { healthGoals, menstrualCycle, emergencyContact } = body.data;

  return handle(async () => {
    const profile = await prisma.patientProfile.update({
      where: { userId: auth.user.id },
      data: {
        healthGoals,
        menstrualCycle: menstrualCycle !== undefined ? menstrualCycle.toString() : undefined,
        emergencyContact,
      },
    });
    await recordActivity({ userId: auth.user.id, type: "PROFILE_UPDATED", title: "Updated health profile settings" });
    return apiSuccess(profile);
  });
}
