import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, handle, parseJson, unauthorized } from "@/lib/api";
import { getClientIp } from "@/lib/getClientIp";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { logAdministrativeAction } from "@/lib/audit";
import { recordPatientActivity } from "@/server/activity/activity.service";
import { verifyLoginCode } from "@/server/auth/loginCode.service";
import { pendingLogin } from "@/server/auth/pendingLogin";

const Input = z.object({ code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your email.") }).strict();

/**
 * Check the code. On success the client calls NextAuth update({ loginCode:
 * "verified" }), and the jwt callback unlocks the session (one time).
 */
export async function POST(req: NextRequest) {
  const login = await pendingLogin(req);
  if (!login) return unauthorized();
  if (login.verified) return apiError("This session is already verified.", 409);
  const ip = getClientIp(req.headers);
  const limit = rateLimit(`login-code-verify:${ip}`, 30, 15 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit);
  const body = await parseJson(req, Input);
  if (!body.ok) return body.response;

  return handle(async () => {
    await verifyLoginCode(login.userId, login.sid, body.data.code);
    if (login.role === "PATIENT") {
      await recordPatientActivity("PATIENT", { userId: login.userId, type: "SIGNED_IN", title: "Confirmed sign-in with an emailed code" });
    } else {
      await logAdministrativeAction({ action: "USER_LOGIN", actorId: login.userId, targetId: login.userId, details: { secondFactor: "email-code" }, ipAddress: ip ?? undefined });
    }
    return apiSuccess({ verified: true }, 200, { "Cache-Control": "no-store" });
  });
}
