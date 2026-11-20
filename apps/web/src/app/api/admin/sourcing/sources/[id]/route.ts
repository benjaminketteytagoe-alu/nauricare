import { z } from "zod";
import { apiSuccess, handle, parseJson, unauthorized } from "@/lib/api";
import { getUserIdWithRole } from "@/lib/auth-guards";
import { enforceRateLimit } from "@/lib/rateLimit";
import { idSchema } from "@/lib/validation/common";
import { setSourceActive } from "@/server/sourcing/sourcing.service";

const Patch = z.object({ isActive: z.boolean() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getUserIdWithRole("ADMIN");
  if (!adminId) return unauthorized();
  const limited = enforceRateLimit(`admin-sourcing:${adminId}`);
  if (limited) return limited;
  const parsed = await parseJson(req, Patch);
  if (!parsed.ok) return parsed.response;
  return handle(async () => {
    const id = idSchema.parse((await params).id);
    return apiSuccess({ source: await setSourceActive(adminId, id, parsed.data.isActive) });
  });
}
