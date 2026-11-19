import { z } from "zod";
import { apiSuccess, handle, parseJson, unauthorized } from "@/lib/api";
import { getUserIdWithRole } from "@/lib/auth-guards";
import { sanitizePlainText } from "@/lib/sanitize";
import { idSchema } from "@/lib/validation/common";
import { toAdminCandidate, updateCandidate } from "@/server/sourcing/sourcing.service";

const text = (max: number) => z.string().trim().max(max).transform(sanitizePlainText);
const Patch = z.object({
  fullName: text(120).pipe(z.string().min(3)).optional(),
  specialty: text(120).pipe(z.string().min(3)).optional(),
  email: z.union([z.literal(""), z.email()]).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  yearsExperience: z.number().int().min(0).max(70).nullable().optional(),
  facilityName: text(160).nullable().optional(),
  practiceLocation: text(200).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getUserIdWithRole("ADMIN");
  if (!adminId) return unauthorized();
  const parsed = await parseJson(req, Patch);
  if (!parsed.ok) return parsed.response;
  return handle(async () => {
    const id = idSchema.parse((await params).id);
    const candidate = await updateCandidate(adminId, id, { ...parsed.data, email: parsed.data.email || null });
    return apiSuccess({ candidate: toAdminCandidate(candidate) });
  });
}
