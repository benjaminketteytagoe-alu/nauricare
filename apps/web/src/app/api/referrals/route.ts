import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { SPECIALTIES, TRIAGE_SEVERITIES, insuranceLabel, type TriageSeverity } from "@/lib/referrals/constants";
import { generateReferralCode } from "@/lib/referrals/server";
import { getUserIdWithRole } from "@/lib/auth-guards";
import { maxSeverity, screenRedFlags } from "@/lib/triage/redFlags";
import { recordActivity } from "@/server/activity/activity.service";

const ReferralInput = z.object({
  hospitalId: z.string().min(1, "Choose a hospital."),
  specialtyRequired: z.enum(SPECIALTIES),
  clinicalReason: z
    .string()
    .trim()
    .min(10, "Describe the reason for the referral in at least 10 characters.")
    .max(2000, "Keep the reason under 2000 characters."),
  symptomCheckId: z.string().optional(),
});

const referralSelect = {
  id: true,
  referralCode: true,
  specialtyRequired: true,
  clinicalReason: true,
  triageSeverity: true,
  insuranceSnapshot: true,
  status: true,
  createdAt: true,
  hospital: { select: { name: true, address: true, district: true, phone: true } },
} satisfies Prisma.ReferralSelect;

export async function GET() {
  const userId = await getUserIdWithRole("PATIENT");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const referrals = await prisma.referral.findMany({
    where: { patientId: userId },
    orderBy: { createdAt: "desc" },
    select: referralSelect,
  });
  return NextResponse.json({ referrals });
}

// Severity is always decided server-side: from the stored triage result when
// the referral comes from a symptom check, and from the red-flag screen of the
// written reason either way. The client never supplies it.
async function resolveSeverity(userId: string, reason: string, symptomCheckId?: string): Promise<TriageSeverity> {
  let severity = screenRedFlags([], reason).floor;
  if (symptomCheckId) {
    const check = await prisma.symptomCheck.findFirst({
      where: { id: symptomCheckId, userId },
      select: { answers: true },
    });
    const stored = (check?.answers as { triage?: { severity?: string } } | null)?.triage?.severity;
    if (stored && (TRIAGE_SEVERITIES as readonly string[]).includes(stored)) {
      severity = maxSeverity(severity, stored as TriageSeverity);
    }
  }
  return severity;
}

export async function POST(req: Request) {
  const userId = await getUserIdWithRole("PATIENT");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = rateLimit(`referrals:${userId}`, 10, 60 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit);

  const parsed = ReferralInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { hospitalId, specialtyRequired, clinicalReason, symptomCheckId } = parsed.data;

  const [hospital, insurance] = await Promise.all([
    prisma.hospital.findUnique({ where: { id: hospitalId }, select: { id: true } }),
    prisma.patientInsurance.findUnique({ where: { userId } }),
  ]);
  if (!hospital) return NextResponse.json({ error: "That hospital is no longer available." }, { status: 404 });

  const triageSeverity = await resolveSeverity(userId, clinicalReason, symptomCheckId);

  // Frozen copy so later edits to the patient's insurance never rewrite what
  // the hospital was told at the time of referral.
  const insuranceSnapshot = {
    provider: insurance?.provider ?? "NONE_CASH",
    providerLabel: insuranceLabel(insurance?.provider ?? "NONE_CASH", insurance?.otherProviderName),
    otherProviderName: insurance?.otherProviderName ?? null,
    policyNumber: insurance?.policyNumber ?? null,
    principalMember: insurance?.principalMember ?? null,
    expiryDate: insurance?.expiryDate?.toISOString() ?? null,
    capturedAt: new Date().toISOString(),
  };

  // Retry on the rare referral-code collision (unique constraint P2002).
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const referral = await prisma.referral.create({
        data: {
          patientId: userId,
          hospitalId,
          specialtyRequired,
          clinicalReason,
          triageSeverity,
          insuranceSnapshot,
          referralCode: generateReferralCode(),
        },
        select: referralSelect,
      });
      await recordActivity({
        userId,
        type: "REFERRAL_CREATED",
        title: `Created referral ${referral.referralCode} to ${referral.hospital.name}`,
        details: { specialty: specialtyRequired, severity: triageSeverity },
        ref: { type: "Referral", id: referral.id },
      });
      return NextResponse.json({ referral }, { status: 201 });
    } catch (error) {
      const collision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        String(error.meta?.target ?? "").includes("referralCode");
      if (!collision) {
        console.error("[REFERRAL_CREATE_ERROR]", error);
        return NextResponse.json({ error: "Could not create your referral." }, { status: 500 });
      }
    }
  }
  return NextResponse.json({ error: "Could not create your referral. Please try again." }, { status: 500 });
}
