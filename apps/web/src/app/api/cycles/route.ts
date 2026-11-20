import { z } from "zod";
import { apiSuccess, handle, notFound, parseJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";

const CycleInput = z.object({
  startDate: z
    .string()
    .max(40)
    .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid start date.")
    .refine((v) => Date.parse(v) <= Date.now() + 24 * 60 * 60_000, "The start date can't be in the future.")
    .refine((v) => Date.parse(v) >= Date.parse("2000-01-01"), "Enter a valid start date."),
});

// Logs the start of a new cycle (the dashboard's pen-icon modal).
export async function POST(req: Request) {
  const auth = await requireApiUser("PATIENT");
  if (!auth.ok) return auth.response;
  const limited = enforceRateLimit(`cycles:${auth.user.id}`);
  if (limited) return limited;
  const body = await parseJson(req, CycleInput);
  if (!body.ok) return body.response;

  return handle(async () => {
    const profile = await prisma.patientProfile.findUnique({ where: { userId: auth.user.id }, select: { id: true } });
    if (!profile) return notFound("Patient profile not found. Please complete onboarding.");
    const cycleLog = await prisma.cycleLog.create({
      data: { patientProfileId: profile.id, startDate: new Date(body.data.startDate) },
    });
    return apiSuccess(cycleLog, 201);
  });
}
