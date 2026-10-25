import { z } from "zod";
import { apiSuccess, handle, notFound, parseJson } from "@/lib/api";
import { getClientIp } from "@/lib/getClientIp";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { passwordField } from "@/lib/validation/password";
import { claimInvitation, getInvitation } from "@/server/sourcing/sourcing.service";

const Claim = z.object({
  password: passwordField,
  licenseNumber: z.string().trim().min(3, "Enter your medical licence number.").max(40).regex(/^[A-Za-z0-9/ -]+$/, "Use letters, numbers, spaces, / or - only."),
  acceptTerms: z.literal(true, { error: "Please accept the Terms of Service." }),
  consentToListing: z.literal(true, { error: "Please agree to be listed for patients." }),
});

type Ctx = { params: Promise<{ token: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const limit = rateLimit(`provider-claim-view:${getClientIp(req.headers)}`, 30, 10 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit);
  const invitation = await getInvitation((await params).token);
  return invitation ? apiSuccess({ invitation }) : notFound("This invitation link is invalid or has expired.");
}

export async function POST(req: Request, { params }: Ctx) {
  const limit = rateLimit(`provider-claim:${getClientIp(req.headers)}`, 5, 15 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit);
  const parsed = await parseJson(req, Claim);
  if (!parsed.ok) return parsed.response;
  const token = (await params).token;
  return handle(async () => {
    const { email } = await claimInvitation(token, { password: parsed.data.password, licenseNumber: parsed.data.licenseNumber.toUpperCase() });
    return apiSuccess({ ok: true, email }, 201);
  });
}
