import { z } from "zod";
import { apiError, apiSuccess, handle, parseJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth-guards";
import { getTriageConsent } from "@/lib/consent";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";
import { runTriage, toLegacyRiskLevel } from "@/lib/triage/engine";
import { recordActivity } from "@/server/activity/activity.service";

const SymptomInput = z.object({
  symptoms: z.array(z.string().trim().min(1).max(60)).min(1, "Select at least one symptom.").max(20),
  cycleDay: z.coerce.number().int().min(0).max(100).catch(0),
  notes: z.string().max(2000, "Notes must be under 2000 characters.").default(""),
});

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;

  return handle(async () => {
    // Server-side consent gate: the UI gate can be bypassed, this cannot.
    const consent = await getTriageConsent(userId);
    if (!consent.valid) {
      return apiError(
        "Please review and accept the AI triage consent before using the symptom checker.",
        403,
        "CONSENT_REQUIRED",
      );
    }

    // AI triage is an LLM call, so it has a tighter budget than other writes.
    const limited = enforceRateLimit(`symptoms-ai:${userId}`, 10, 10 * 60_000);
    if (limited) return limited;

    const body = await parseJson(req, SymptomInput);
    if (!body.ok) return body.response;
    const { symptoms, cycleDay, notes } = body.data;

    const triage = await runTriage({ symptoms, cycleDay, notes });

    const log = await prisma.symptomCheck.create({
      data: {
        userId,
        answers: { symptoms, cycleDay, notes, triage: { ...triage } },
        riskLevel: toLegacyRiskLevel(triage.severity),
      },
    });

    await recordActivity({
      userId,
      type: "AI_TRIAGE",
      title: `AI symptom check: ${triage.severity.toLowerCase()} urgency`,
      details: {
        prompt: { symptoms, cycleDay, notes },
        response: {
          severity: triage.severity,
          summary: triage.summary,
          recommendedSpecialty: triage.recommendedSpecialty,
          redFlags: triage.redFlags,
          seekCareWithin: triage.seekCareWithin,
          engine: triage.engine,
        },
      },
      ref: { type: "SymptomCheck", id: log.id },
    });

    return apiSuccess({ message: "Symptoms logged successfully", log, aiInsight: triage.summary, triage }, 201);
  });
}

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  return handle(async () => {
    const logs = await prisma.symptomCheck.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    return apiSuccess({ logs }, 200, { "Cache-Control": "private, no-store" });
  });
}
