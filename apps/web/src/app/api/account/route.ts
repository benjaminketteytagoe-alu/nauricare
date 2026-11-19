import { z } from "zod";
import { apiSuccess, handle, parseJson, unauthorized } from "@/lib/api";
import { getUserIdWithRole } from "@/lib/auth-guards";
import { getClientIp } from "@/lib/getClientIp";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { deletePatientAccount, getDeletionPhrase } from "@/server/account/deletion.service";

const DeleteInput = z.object({ confirmation: z.string().trim().min(1, "Type the confirmation text.").max(254) }).strict();

/** The phrase the signed-in patient must type to delete their account. */
export async function GET() {
  const userId = await getUserIdWithRole("PATIENT");
  if (!userId) return unauthorized();
  return handle(async () => apiSuccess({ phrase: await getDeletionPhrase(userId) }, 200, { "Cache-Control": "private, no-store" }));
}

/** Permanently close the signed-in patient's account (soft delete + anonymise). */
export async function DELETE(req: Request) {
  const userId = await getUserIdWithRole("PATIENT");
  if (!userId) return unauthorized();
  const limit = rateLimit(`account-delete:${userId}`, 5, 15 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit);
  const body = await parseJson(req, DeleteInput);
  if (!body.ok) return body.response;
  return handle(async () => {
    await deletePatientAccount(userId, body.data.confirmation, getClientIp(req.headers));
    return apiSuccess({ deleted: true });
  });
}
