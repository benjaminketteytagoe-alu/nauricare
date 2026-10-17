import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserIdWithRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logAdministrativeAction } from "@/lib/audit";
import { getClientIp } from "@/lib/getClientIp";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { CURRENT_CONSENT_VERSION, getTriageConsent } from "@/lib/consent";

// Each consent must be an explicit `true`. A missing or false value is
// refused rather than treated as "no", so pre-ticked or defaulted consent
// can never be recorded.
const GrantInput = z.object({
  privacy: z.literal(true, { error: "Please agree to the processing of your health data." }),
  triage: z.literal(true, { error: "Please confirm you understand the limits of AI triage." }),
  version: z.string(),
});

export async function GET() {
  const userId = await getUserIdWithRole("PATIENT");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const consent = await getTriageConsent(userId);
  return NextResponse.json({ consent, currentVersion: CURRENT_CONSENT_VERSION });
}

export async function POST(req: Request) {
  const userId = await getUserIdWithRole("PATIENT");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = rateLimit(`consent:${userId}`, 20, 60 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit);

  const parsed = GrantInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid consent." }, { status: 400 });
  }
  // The client must have shown the notice we currently publish.
  if (parsed.data.version !== CURRENT_CONSENT_VERSION) {
    return NextResponse.json(
      { error: "Our consent notice has been updated. Please reload the page and review it again." },
      { status: 409 },
    );
  }

  const grantedAt = new Date();
  await prisma.user.update({
    where: { id: userId },
    data: {
      hasConsentedToPrivacy: true,
      hasConsentedToTriage: true,
      consentTimestamp: grantedAt,
      consentVersion: CURRENT_CONSENT_VERSION,
    },
  });

  await logAdministrativeAction({
    action: "TRIAGE_CONSENT_GRANTED",
    actorId: userId,
    targetId: userId,
    ipAddress: getClientIp(req.headers),
    details: {
      version: CURRENT_CONSENT_VERSION,
      grantedAt: grantedAt.toISOString(),
      scopes: ["sensitive_health_data_processing", "ai_triage", "cross_border_model_processing"],
      userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
  });

  return NextResponse.json({ consent: { valid: true, grantedAt, version: CURRENT_CONSENT_VERSION } });
}

// Withdrawal must be as easy as granting (Law N° 058/2021). It stops future
// AI processing. It does not delete logs already created; the user can ask
// for erasure separately, as the Privacy Policy explains.
export async function DELETE(req: Request) {
  const userId = await getUserIdWithRole("PATIENT");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({
    where: { id: userId },
    data: { hasConsentedToTriage: false, hasConsentedToPrivacy: false, consentTimestamp: null },
  });

  await logAdministrativeAction({
    action: "TRIAGE_CONSENT_WITHDRAWN",
    actorId: userId,
    targetId: userId,
    ipAddress: getClientIp(req.headers),
    details: { withdrawnAt: new Date().toISOString() },
  });

  return NextResponse.json({ consent: { valid: false, grantedAt: null, version: null } });
}
