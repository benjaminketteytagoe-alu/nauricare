import { z } from "zod";
import { PatientActivityType } from "@prisma/client";
import { apiError, apiSuccess, handle, unauthorized } from "@/lib/api";
import { getUserIdWithRole } from "@/lib/auth-guards";
import { activityCounts, listActivity } from "@/server/activity/activity.query";

const Query = z.object({
  types: z
    .string()
    .max(500)
    .optional()
    .transform((v) => (v ? v.split(",").filter(Boolean) : []))
    .pipe(z.array(z.enum(PatientActivityType)).max(20)),
  cursor: z.string().max(64).optional(),
  counts: z.enum(["1"]).optional(),
});

// The signed-in patient's own activity history (never anyone else's).
export async function GET(req: Request) {
  const userId = await getUserIdWithRole("PATIENT");
  if (!userId) return unauthorized();
  const q = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!q.success) return apiError("Invalid filter.", 400);
  return handle(async () => {
    const page = await listActivity(userId, { types: q.data.types, cursor: q.data.cursor });
    return apiSuccess({ ...page, ...(q.data.counts ? { counts: await activityCounts(userId) } : {}) }, 200, { "Cache-Control": "private, no-store" });
  });
}
