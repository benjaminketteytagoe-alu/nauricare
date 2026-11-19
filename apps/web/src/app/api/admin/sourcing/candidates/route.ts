import { z } from "zod";
import { apiError, apiSuccess, handle, unauthorized } from "@/lib/api";
import { getUserIdWithRole } from "@/lib/auth-guards";
import { listCandidates, toAdminCandidate } from "@/server/sourcing/sourcing.service";

const Query = z.object({
  status: z.enum(["PENDING_REVIEW", "INVITED", "PUBLISHED", "REJECTED", "DUPLICATE"]).optional(),
  cursor: z.string().max(64).optional(),
});

export async function GET(req: Request) {
  if (!(await getUserIdWithRole("ADMIN"))) return unauthorized();
  const q = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!q.success) return apiError("Invalid filter.", 400);
  return handle(async () => {
    const rows = await listCandidates(q.data.status, q.data.cursor);
    const hasMore = rows.length > 25;
    const candidates = rows.slice(0, 25).map(toAdminCandidate);
    return apiSuccess({ candidates, nextCursor: hasMore ? candidates[candidates.length - 1].id : null });
  });
}
