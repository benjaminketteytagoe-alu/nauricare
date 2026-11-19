import { z } from "zod";
import { apiSuccess, handle, parseJson, unauthorized } from "@/lib/api";
import { getUserIdWithRole } from "@/lib/auth-guards";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { idSchema } from "@/lib/validation/common";
import { createShare, listShares } from "@/server/referrals/share.service";

type Ctx = { params: Promise<{ id: string }> };
const CreateInput = z.object({ days: z.number().int().min(1).max(30).default(14) });

export async function GET(_req: Request, { params }: Ctx) {
  const userId = await getUserIdWithRole("PATIENT");
  if (!userId) return unauthorized();
  return handle(async () => apiSuccess({ shares: await listShares(userId, idSchema.parse((await params).id)) }));
}

export async function POST(req: Request, { params }: Ctx) {
  const userId = await getUserIdWithRole("PATIENT");
  if (!userId) return unauthorized();
  const limit = rateLimit(`referral-share-create:${userId}`, 10, 60 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit);
  const parsed = await parseJson(req, CreateInput);
  if (!parsed.ok) return parsed.response;
  return handle(async () => apiSuccess(await createShare(userId, idSchema.parse((await params).id), parsed.data.days), 201));
}
