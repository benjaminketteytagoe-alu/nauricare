import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { CURRENT_CONSENT_VERSION, evaluateConsent } from "@/lib/consent";
import { TriageGate } from "@/components/triage-gate/TriageGate";
import { ConsentStatusBar } from "@/components/triage-gate/ConsentStatusBar";

export const dynamic = "force-dynamic";

// AI triage entry gate. Nothing under /dashboard/symptoms renders until the
// patient holds valid, current-version consent. The symptoms API enforces the
// same rule independently, so this layout is the UX, not the only lock.
export default async function SymptomsLayout({ children }: { children: React.ReactNode }) {
  await cookies(); // forces dynamic rendering — prevents cross-user cache leak
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

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
    return <TriageGate firstName={firstName} version={CURRENT_CONSENT_VERSION} />;
  }

  return (
    <>
      <ConsentStatusBar grantedAt={consent.grantedAt!.toISOString()} />
      {children}
    </>
  );
}
