import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { SPECIALTIES, TRIAGE_SEVERITIES, type Specialty, type TriageSeverity } from "@/lib/referrals/constants";
import { ReferralWizard, type WizardInsurance, type WizardPrefill } from "@/components/referrals/ReferralWizard";

export const dynamic = "force-dynamic";

interface StoredAnswers {
  symptoms?: string[];
  notes?: string;
  triage?: { severity?: string; recommendedSpecialty?: string; summary?: string };
}

export default async function NewReferralPage({ searchParams }: { searchParams: Promise<{ checkId?: string }> }) {
  await cookies(); // forces dynamic rendering — prevents cross-user cache leak
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const { checkId } = await searchParams;

  const [check, insurance] = await Promise.all([
    checkId
      ? prisma.symptomCheck.findFirst({ where: { id: checkId, userId }, select: { id: true, answers: true } })
      : null,
    prisma.patientInsurance.findUnique({ where: { userId } }),
  ]);

  const prefill: WizardPrefill = {};
  if (check) {
    const answers = (check.answers ?? {}) as StoredAnswers;
    const sev = answers.triage?.severity;
    const spec = answers.triage?.recommendedSpecialty;
    prefill.symptomCheckId = check.id;
    if (sev && (TRIAGE_SEVERITIES as readonly string[]).includes(sev)) prefill.severity = sev as TriageSeverity;
    if (spec && (SPECIALTIES as readonly string[]).includes(spec)) prefill.specialty = spec as Specialty;
    prefill.reason = [
      answers.symptoms?.length ? `Symptoms: ${answers.symptoms.join(", ")}.` : "",
      answers.notes ? `Notes: ${answers.notes}` : "",
      answers.triage?.summary ? `AI triage summary: ${answers.triage.summary}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  const initialInsurance: WizardInsurance | null = insurance
    ? {
        provider: insurance.provider,
        policyNumber: insurance.policyNumber ?? "",
        principalMember: insurance.principalMember ?? "",
        expiryDate: insurance.expiryDate ? insurance.expiryDate.toISOString().slice(0, 10) : "",
      }
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <Link href="/dashboard/referrals" className="flex w-fit items-center gap-2 font-medium text-nc-primary hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> My referrals
      </Link>
      <header>
        <h1 className="text-2xl font-bold text-nc-ink sm:text-3xl">New hospital referral</h1>
        <p className="mt-1 text-slate-600">Four short steps. Your answers are saved securely to your NauriCare record.</p>
      </header>
      <ReferralWizard prefill={prefill} initialInsurance={initialInsurance} />
    </div>
  );
}
