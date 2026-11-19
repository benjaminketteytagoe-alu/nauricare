import { apiSuccess, handle, notFound } from "@/lib/api";
import { requireApiUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireApiUser("PATIENT");
  if (!auth.ok) return auth.response;
  return handle(async () => {
    const profile = await prisma.patientProfile.findUnique({ where: { userId: auth.user.id } });
    if (!profile) return notFound("Patient profile not found.");

    const latestLog = await prisma.cycleLog.findFirst({
      where: { patientProfileId: profile.id },
      orderBy: { startDate: "desc" },
    });

    // Fall back to the profile's saved average (e.g. "28"), defaulting to 28,
    // whenever a log doesn't carry its own cycleLength (the logging modal only
    // ever submits a startDate).
    const parsed = parseInt(profile.menstrualCycle ?? "", 10);
    const profileCycleLength = Number.isFinite(parsed) ? parsed : 28;

    return apiSuccess({
      cycleLength: latestLog?.cycleLength ?? profileCycleLength,
      lastPeriodDate: latestLog?.startDate.toISOString() ?? null,
    });
  });
}
