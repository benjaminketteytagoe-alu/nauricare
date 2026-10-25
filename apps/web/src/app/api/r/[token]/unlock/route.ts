import { z } from "zod";
import { apiSuccess, handle, parseJson } from "@/lib/api";
import { getClientIp } from "@/lib/getClientIp";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { unlockShare } from "@/server/referrals/share.service";

// Public endpoint used by hospital staff (and hospital systems) to unlock a
// shared referral with the patient's referral code. Never cached or indexed.
const Unlock = z.object({ code: z.string().trim().min(6).max(20) });
const NO_STORE = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" };

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIp(req.headers);
  const limit = rateLimit(`referral-unlock:${ip}`, 10, 15 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit);
  const parsed = await parseJson(req, Unlock);
  if (!parsed.ok) return parsed.response;
  const res = await handle(async () => {
    const payload = await unlockShare((await params).token, parsed.data.code, { ip: ip === "unknown" ? null : ip, userAgent: req.headers.get("user-agent") });
    return apiSuccess({ referral: payload });
  });
  for (const [k, v] of Object.entries(NO_STORE)) res.headers.set(k, v);
  return res;
}
