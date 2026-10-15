import { prisma } from "@/lib/prisma";
import { getEmailDomain } from "@/lib/academicEmail";

/**
 * Auto-enrolls a user into their employer's NauriCare Corporate Care seat if
 * their (now-verified) email domain matches an Organization with an ACTIVE
 * CorporateSubscription and a free seat. Idempotent — a user already linked
 * to an organization is left alone.
 *
 * The seat increment is a single atomic `UPDATE ... WHERE usedSeats <
 * allocatedSeats` executed at the database level (not a read-then-write in
 * application code), so two employees verifying their email in the same
 * instant can never both claim the last seat and over-provision the org.
 */
export async function linkCorporateEmployeeIfEligible(userId: string, email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isCorporateEmployee: true },
  });
  if (!user || user.isCorporateEmployee) return false;

  const domain = getEmailDomain(email);
  if (!domain) return false;

  const org = await prisma.organization.findUnique({
    where: { corporateEmailDomain: domain },
    select: { id: true, subscription: { select: { status: true } } },
  });
  if (!org || org.subscription?.status !== "ACTIVE") return false;

  const claimed = await prisma.$executeRaw`
    UPDATE "Organization"
    SET "usedSeats" = "usedSeats" + 1
    WHERE "id" = ${org.id} AND "usedSeats" < "allocatedSeats"
  `;
  if (claimed === 0) return false; // seats exhausted

  await prisma.user.update({
    where: { id: userId },
    data: { organizationId: org.id, isCorporateEmployee: true },
  });

  return true;
}
