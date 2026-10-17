import { prisma } from "@/lib/prisma";

// The version lives in a client-safe module. Bumping it shows everyone the
// gate again, because Law N° 058/2021 consent must be informed by the notice
// that actually applies.
import { CURRENT_CONSENT_VERSION } from "@/lib/consentVersion";
export { CURRENT_CONSENT_VERSION };

export interface TriageConsent {
  valid: boolean;
  grantedAt: Date | null;
  version: string | null;
}

interface ConsentFields {
  hasConsentedToPrivacy: boolean;
  hasConsentedToTriage: boolean;
  consentTimestamp: Date | null;
  consentVersion: string | null;
}

// consentVersion has a column default, so its value alone proves nothing.
// A grant is only valid with both flags AND a timestamp AND the current version.
export function evaluateConsent(u: ConsentFields | null): TriageConsent {
  const valid = Boolean(
    u &&
      u.hasConsentedToPrivacy &&
      u.hasConsentedToTriage &&
      u.consentTimestamp &&
      u.consentVersion === CURRENT_CONSENT_VERSION,
  );
  return {
    valid,
    grantedAt: valid ? u!.consentTimestamp : null,
    version: valid ? u!.consentVersion : null,
  };
}

export async function getTriageConsent(userId: string): Promise<TriageConsent> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hasConsentedToPrivacy: true, hasConsentedToTriage: true, consentTimestamp: true, consentVersion: true },
  });
  return evaluateConsent(user);
}
