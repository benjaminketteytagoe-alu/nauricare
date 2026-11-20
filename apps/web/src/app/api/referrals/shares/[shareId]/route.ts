import { apiSuccess, handle, unauthorized } from "@/lib/api";
import { getUserIdWithRole } from "@/lib/auth-guards";
import { enforceRateLimit } from "@/lib/rateLimit";
import { idSchema } from "@/lib/validation/common";
import { revokeShare } from "@/server/referrals/share.service";

export async function DELETE(_req: Request, { params }: { params: Promise<{ shareId: string }> }) {
  const userId = await getUserIdWithRole("PATIENT");
  if (!userId) return unauthorized();
  const limited = enforceRateLimit(`referral-shares:${userId}`);
  if (limited) return limited;
  return handle(async () => {
    await revokeShare(userId, idSchema.parse((await params).shareId));
    return apiSuccess({ ok: true });
  });
}
