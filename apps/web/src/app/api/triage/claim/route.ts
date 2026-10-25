import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, parseJson, unauthorized } from "@/lib/api";
import { getUserIdWithRole } from "@/lib/auth-guards";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { getTriageConsent } from "@/lib/consent";
import { toLegacyRiskLevel } from "@/lib/triage/engine";
import { openGuestTriage } from "@/lib/triage/claimToken";
import { recordActivity } from "@/server/activity/activity.service";

// Moves a guest's sealed landing-page triage into the signed-in patient's
// health log, so the referral wizard can be pre-filled from it. The stored
// severity comes only from the authenticated, encrypted token.

const ClaimInput = z.object({ claimToken: z.string().min(30).max(8000) });

export async function POST(req: Request) {
  const userId = await getUserIdWithRole("PATIENT");
  if (!userId) return unauthorized();

  const limit = rateLimit(`triage-claim:${userId}`, 10, 10 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit);

  const parsed = await parseJson(req, ClaimInput);
  if (!parsed.ok) return parsed.response;

  // Saving health data to the account needs account-level consent.
  const consent = await getTriageConsent(userId);
  if (!consent.valid) return apiError("Please confirm your consent first.", 403, "CONSENT_REQUIRED");

  const payload = openGuestTriage(parsed.data.claimToken);
  if (!payload) return apiError("This assessment has expired. Please run the symptom guide again.", 410, "CLAIM_EXPIRED");

  // Idempotent: claiming the same token twice returns the same record.
  const existing = await prisma.symptomCheck.findFirst({
    where: { userId, answers: { path: ["claimJti"], equals: payload.jti } },
    select: { id: true },
  });
  if (existing) return apiSuccess({ checkId: existing.id });

  const check = await prisma.symptomCheck.create({
    data: {
      userId,
      answers: {
        symptoms: payload.symptoms,
        cycleDay: 0,
        notes: payload.notes,
        triage: { ...payload.triage },
        source: "landing_guest",
        claimJti: payload.jti,
      },
      riskLevel: toLegacyRiskLevel(payload.triage.severity),
    },
    select: { id: true },
  });
  await recordActivity({
    userId,
    type: "AI_TRIAGE",
    title: `Saved Nauri assessment from the website: ${payload.triage.severity.toLowerCase()} urgency`,
    details: {
      prompt: { symptoms: payload.symptoms, notes: payload.notes },
      response: {
        severity: payload.triage.severity,
        summary: payload.triage.summary,
        recommendedSpecialty: payload.triage.recommendedSpecialty,
        redFlags: payload.triage.redFlags,
        engine: payload.triage.engine,
      },
      source: "landing_guest",
    },
    ref: { type: "SymptomCheck", id: check.id },
  });
  return apiSuccess({ checkId: check.id }, 201);
}
