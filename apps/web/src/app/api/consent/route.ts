import { z } from "zod";
import { apiError, apiSuccess, handle, parseJson } from "@/lib/api";
import { logAdministrativeAction } from "@/lib/audit";
import { requireApiUser } from "@/lib/auth-guards";
import { CURRENT_CONSENT_VERSION, getTriageConsent } from "@/lib/consent";
import { getClientIp } from "@/lib/getClientIp";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";
import { recordActivity } from "@/server/activity/activity.service";

// Each consent must be an explicit `true`. A missing or false value is
// refused rather than treated as "no", so pre-ticked or defaulted consent
// can never be recorded.
const GrantInput = z.object({
  privacy: z.literal(true, { error: "Please agree to the processing of your health data." }),
  triage: z.literal(true, { error: "Please confirm you understand the limits of AI triage." }),
  version: z.string(),
});

export async function GET() {
  const auth = await requireApiUser("PATIENT");
  if (!auth.ok) return auth.response;
  return handle(async () =>
    apiSuccess({ consent: await getTriageConsent(auth.user.id), currentVersion: CURRENT_CONSENT_VERSION }),
  );
}

export async function POST(req: Request) {
  const auth = await requireApiUser("PATIENT");
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;
  const limited = enforceRateLimit(`consent:${userId}`, 20, 60 * 60_000);
  if (limited) return limited;
  const parsed = await parseJson(req, GrantInput);
  if (!parsed.ok) return parsed.response;
  // The client must have shown the notice we currently publish.
  if (parsed.data.version !== CURRENT_CONSENT_VERSION) {
    return apiError("Our consent notice has been updated. Please reload the page and review it again.", 409);
  }

  return handle(async () => {
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

    await recordActivity({
      userId,
      type: "CONSENT_GRANTED",
      title: "Agreed to AI triage consent",
      details: { version: CURRENT_CONSENT_VERSION },
    });
    return apiSuccess({ consent: { valid: true, grantedAt, version: CURRENT_CONSENT_VERSION } });
  });
}

// Withdrawal must be as easy as granting (Law N° 058/2021). It stops future
// AI processing. It does not delete logs already created; the user can ask
// for erasure separately, as the Privacy Policy explains.
export async function DELETE(req: Request) {
  const auth = await requireApiUser("PATIENT");
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;
  const limited = enforceRateLimit(`consent:${userId}`, 20, 60 * 60_000);
  if (limited) return limited;

  return handle(async () => {
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

    await recordActivity({ userId, type: "CONSENT_WITHDRAWN", title: "Withdrew AI triage consent" });
    return apiSuccess({ consent: { valid: false, grantedAt: null, version: null } });
  });
}
