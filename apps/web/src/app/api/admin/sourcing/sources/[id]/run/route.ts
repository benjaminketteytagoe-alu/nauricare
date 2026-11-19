import { apiSuccess, handle, unauthorized } from "@/lib/api";
import { getUserIdWithRole } from "@/lib/auth-guards";
import { enforceRateLimit } from "@/lib/rateLimit";
import { idSchema } from "@/lib/validation/common";
import { startScrapeRun } from "@/server/sourcing/sourcing.service";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getUserIdWithRole("ADMIN");
  if (!adminId) return unauthorized();
  const limited = enforceRateLimit(`admin-sourcing-run:${adminId}`, 20, 60 * 60_000);
  if (limited) return limited;
  return handle(async () => {
    const id = idSchema.parse((await params).id);
    return apiSuccess({ run: await startScrapeRun(adminId, id) }, 202);
  });
}
