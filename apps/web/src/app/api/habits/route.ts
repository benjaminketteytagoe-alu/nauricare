import { z } from "zod";
import { apiSuccess, handle, notFound, parseJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";
import { dateKeySchema } from "@/lib/validation/common";

const HabitInput = z.object({
  habitId: z.coerce.number().int().min(0).max(1000),
  completed: z.boolean(),
  date: dateKeySchema,
});

export async function POST(req: Request) {
  const auth = await requireApiUser("PATIENT");
  if (!auth.ok) return auth.response;
  const limited = enforceRateLimit(`habits:${auth.user.id}`);
  if (limited) return limited;
  const body = await parseJson(req, HabitInput);
  if (!body.ok) return body.response;
  const { habitId, completed } = body.data;
  const date = new Date(body.data.date);

  return handle(async () => {
    const profile = await prisma.patientProfile.findUnique({ where: { userId: auth.user.id }, select: { id: true } });
    if (!profile) return notFound("Profile not found.");
    // The upsert relies on the unique (patientProfileId, habitId, date) constraint.
    const log = await prisma.habitLog.upsert({
      where: { patientProfileId_habitId_date: { patientProfileId: profile.id, habitId, date } },
      update: { completed },
      create: { patientProfileId: profile.id, habitId, date, completed },
    });
    return apiSuccess(log);
  });
}
