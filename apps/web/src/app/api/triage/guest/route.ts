import { z } from "zod";
import { apiError, apiSuccess, parseJson } from "@/lib/api";
import { getClientIp } from "@/lib/getClientIp";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { sanitizePlainText } from "@/lib/sanitize";
import { CURRENT_CONSENT_VERSION } from "@/lib/consent";
import { runTriage, toTriageOutcome } from "@/lib/triage/engine";
import { sealGuestTriage } from "@/lib/triage/claimToken";

// Public "Nauri" triage for signed-out visitors on the landing page.
// Abuse controls: strict per-IP limit, plus a global hourly budget after
// which requests are answered by the deterministic safety rules only, so a
// distributed flood cannot run up unbounded model costs.

const GuestTriageInput = z.object({
  symptoms: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  notes: z.string().max(1000, "Please keep your description under 1000 characters.").default(""),
  consentVersion: z.string().max(20),
}).refine((v) => v.symptoms.length > 0 || v.notes.trim().length >= 3, {
  message: "Tell Nauri a little about how you're feeling.",
});

const GLOBAL_GUEST_MODEL_BUDGET_PER_HOUR = 300;

export async function POST(req: Request) {
  const ip = getClientIp(req.headers);
  const limit = rateLimit(`guest-triage:${ip}`, 5, 10 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit);

  const parsed = await parseJson(req, GuestTriageInput);
  if (!parsed.ok) return parsed.response;
  const { consentVersion } = parsed.data;

  // The visitor must have accepted the current consent notice in the modal.
  if (consentVersion !== CURRENT_CONSENT_VERSION) {
    return apiError("Please review and accept the consent notice first.", 403, "CONSENT_REQUIRED");
  }

  const symptoms = parsed.data.symptoms.map(sanitizePlainText).filter(Boolean);
  const notes = sanitizePlainText(parsed.data.notes);

  const budget = rateLimit("guest-triage:global-model-budget", GLOBAL_GUEST_MODEL_BUDGET_PER_HOUR, 60 * 60_000);
  const triage = await runTriage({ symptoms, cycleDay: 0, notes }, { rulesOnly: !budget.allowed });

  const { token, expiresAt } = sealGuestTriage({ symptoms, notes, triage, consentVersion });

  return apiSuccess({
    triage,
    triageOutcome: toTriageOutcome(triage.severity),
    claimToken: token,
    claimExpiresAt: expiresAt,
  });
}
