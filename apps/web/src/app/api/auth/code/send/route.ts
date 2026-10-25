import type { NextRequest } from "next/server";
import { apiError, apiSuccess, handle, unauthorized } from "@/lib/api";
import { getClientIp } from "@/lib/getClientIp";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { sendLoginCode } from "@/server/auth/loginCode.service";
import { pendingLogin } from "@/server/auth/pendingLogin";

/** Email a fresh 6-digit sign-in code to the signed-in (unverified) user. */
export async function POST(req: NextRequest) {
  const login = await pendingLogin(req);
  if (!login) return unauthorized();
  if (login.verified) return apiError("This session is already verified.", 409);
  const ip = getClientIp(req.headers);
  const limit = rateLimit(`login-code-send:${ip}`, 20, 60 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit);
  return handle(async () => apiSuccess(await sendLoginCode(login.userId, login.sid, ip), 200, { "Cache-Control": "no-store" }));
}
