import { apiSuccess, handle, unauthorized } from "@/lib/api";
import { getUserIdWithRole } from "@/lib/auth-guards";
import { idSchema } from "@/lib/validation/common";
import { revokeShare } from "@/server/referrals/share.service";

export async function DELETE(_req: Request, { params }: { params: Promise<{ shareId: string }> }) {
  const userId = await getUserIdWithRole("PATIENT");
  if (!userId) return unauthorized();
  return handle(async () => {
    await revokeShare(userId, idSchema.parse((await params).shareId));
    return apiSuccess({ ok: true });
  });
}
