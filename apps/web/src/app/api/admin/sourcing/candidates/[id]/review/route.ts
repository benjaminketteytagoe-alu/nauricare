import { z } from "zod";
import { apiSuccess, handle, parseJson, unauthorized } from "@/lib/api";
import { getUserIdWithRole } from "@/lib/auth-guards";
import { sanitizePlainText } from "@/lib/sanitize";
import { idSchema } from "@/lib/validation/common";
import { reviewCandidate, toAdminCandidate } from "@/server/sourcing/sourcing.service";

const Review = z.object({
  action: z.enum(["invite", "publish", "reject", "duplicate"]),
  note: z.string().max(1000).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getUserIdWithRole("ADMIN");
  if (!adminId) return unauthorized();
  const parsed = await parseJson(req, Review);
  if (!parsed.ok) return parsed.response;
  return handle(async () => {
    const id = idSchema.parse((await params).id);
    const result = await reviewCandidate(adminId, id, parsed.data.action, parsed.data.note ? sanitizePlainText(parsed.data.note) : undefined);
    return apiSuccess({ candidate: result.candidate ? toAdminCandidate(result.candidate) : null, emailSent: result.emailSent });
  });
}
