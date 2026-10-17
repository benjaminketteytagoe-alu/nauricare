import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { CURRENT_CONSENT_VERSION, evaluateConsent } from "@/lib/consent";
import { TriageGate } from "@/components/triage-gate/TriageGate";
import { ConsentStatusBar } from "@/components/triage-gate/ConsentStatusBar";
import { TriageHandover } from "@/components/triage-gate/TriageHandover";

export const dynamic = "force-dynamic";

// AI triage entry gate. Nothing under /dashboard/symptoms renders until the
// patient holds valid, current-version consent. The symptoms API enforces the
// same rule independently, so this layout is the UX, not the only lock.
export default async function SymptomsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("PATIENT");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      hasConsentedToPrivacy: true,
      hasConsentedToTriage: true,
      consentTimestamp: true,
      consentVersion: true,
    },
  });
  const consent = evaluateConsent(user);

  if (!consent.valid) {
    const firstName = user?.name?.trim().split(/\s+/)[0] || "there";
    return (
      <>
        <TriageHandover consentValid={false} />
        <TriageGate firstName={firstName} version={CURRENT_CONSENT_VERSION} />
      </>
    );
  }

  return (
    <>
      <TriageHandover consentValid />
      <ConsentStatusBar grantedAt={consent.grantedAt!.toISOString()} />
      {children}
    </>
  );
}
