import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * A provider may see patients only after an admin approves them
 * (approveProviderProfile sets both flags). Self-registered providers start
 * unapproved and see the "verification pending" screen instead of the portal.
 */
export async function isApprovedProvider(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isVerified: true, practitionerProfile: { select: { isVerified: true } } },
  });
  return !!(user?.practitionerProfile?.isVerified || user?.isVerified);
}

export const PENDING_PROVIDER_MESSAGE = "Your provider account is awaiting verification.";
