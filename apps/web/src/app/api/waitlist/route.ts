import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, parseJson } from "@/lib/api";
import { getClientIp } from "@/lib/getClientIp";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { sanitizePlainText } from "@/lib/sanitize";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { WAITLIST_ROLE_VALUES } from "@/lib/waitlist";

const WaitlistInput = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(120),
  email: z.email("Please enter a valid email address.").max(254),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+\d][\d\s()-]{5,}$/, "Please enter a valid phone number.")
    .optional()
    .or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  role: z.enum(WAITLIST_ROLE_VALUES),
  interest: z.string().max(1000, "Please keep this under 1000 characters.").optional().or(z.literal("")),
  source: z.string().max(200).optional(),
  consent: z.literal(true, { error: "Please agree to be contacted about NauriCare." }),
  turnstileToken: z.string().max(4096),
});

// Public endpoint: bot check first, then a per-IP limit, then validation.
export async function POST(req: Request) {
  const ip = getClientIp(req.headers);

  const limit = rateLimit(`waitlist:${ip}`, 5, 10 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit);

  const parsed = await parseJson(req, WaitlistInput);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;

  // Turnstile is verified before any database access (project security rule).
  const isHuman = await verifyTurnstileToken(d.turnstileToken, ip === "unknown" ? undefined : ip);
  if (!isHuman) return apiError("Security check failed. Please try again.", 400, "TURNSTILE_FAILED");

  const email = d.email.trim().toLowerCase();
  const name = sanitizePlainText(d.name);
  if (name.length < 2) return apiError("Please enter your name.", 400);

  try {
    // Idempotent: signing up twice with the same email changes nothing and
    // returns the same response, so the form can't be used to check whether
    // someone is already on the list.
    await prisma.waitlistEntry.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name,
        phone: d.phone || null,
        country: d.country ? sanitizePlainText(d.country) || null : null,
        role: d.role,
        interest: d.interest ? sanitizePlainText(d.interest) || null : null,
        source: d.source ? sanitizePlainText(d.source).slice(0, 200) || null : null,
        consentAt: new Date(),
        ipAddress: ip === "unknown" ? null : ip,
      },
    });
    return apiSuccess({ ok: true }, 201);
  } catch (error) {
    console.error("[WAITLIST_ERROR]", error instanceof Error ? error.message : error);
    return apiError("We couldn't add you right now. Please try again shortly.", 500);
  }
}
