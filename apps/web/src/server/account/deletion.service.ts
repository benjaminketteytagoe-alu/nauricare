import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/api";
import { logAdministrativeAction } from "@/lib/audit";
import { notify } from "@/server/notifications/notify";

// GitHub-style account deletion for patients: type your username to confirm.
//
// The account is soft-deleted and anonymised, not hard-deleted. Identity,
// contact details, sign-in methods and social links are removed at once.
// Clinical records (consultations, prescriptions, referrals, triage, cycle
// history) stay attached to the anonymised record, because healthcare
// providers must retain medical records; they are no longer linked to a name,
// email or phone number. Community posts remain as "Deleted user".

export const DELETED_NAME = "Deleted user";

/** What the patient must type: their community handle, or their email if they have none. */
export function deletionPhrase(user: { handle: string | null; email: string }): string {
  return user.handle ?? user.email;
}

export async function getDeletionPhrase(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { handle: true, email: true, role: true, deletedAt: true } });
  if (!user || user.deletedAt) throw new ServiceError("Account not found.", 404);
  if (user.role !== "PATIENT") throw new ServiceError("Only patient accounts can be deleted here. Please contact support.", 403);
  return deletionPhrase(user);
}

export async function deletePatientAccount(userId: string, confirmation: string, ipAddress?: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, handle: true, email: true, role: true, deletedAt: true, patientProfile: { select: { id: true } } },
  });
  if (!user || user.deletedAt) throw new ServiceError("Account not found.", 404);
  if (user.role !== "PATIENT") throw new ServiceError("Only patient accounts can be deleted here. Please contact support.", 403);
  if (confirmation.trim().toLowerCase() !== deletionPhrase(user).toLowerCase()) {
    throw new ServiceError("That doesn't match. Type it exactly as shown to confirm.", 400);
  }

  const now = new Date();
  const profileId = user.patientProfile?.id;
  const upcoming = profileId
    ? await prisma.appointment.findMany({
        where: { patientProfileId: profileId, status: "SCHEDULED", startTime: { gt: now } },
        select: { id: true, startTime: true, practitioner: { select: { userId: true } } },
      })
    : [];

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        deletedAt: now,
        name: DELETED_NAME,
        email: `deleted-${user.id}@deleted.nauricare.invalid`,
        handle: null,
        phoneNumber: null,
        secondaryEmail: null,
        dateOfBirth: null,
        avatarUrl: null,
        googlePhotoUrl: null,
        passwordHash: "",
        emailVerified: null,
        isEmailVerified: false,
        hasConsentedToTriage: false,
        lastSeenAt: null,
      },
    }),
    prisma.account.deleteMany({ where: { userId: user.id } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.resetToken.deleteMany({ where: { userId: user.id } }),
    prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } }),
    prisma.follow.deleteMany({ where: { OR: [{ followerId: user.id }, { followingId: user.id }] } }),
    prisma.reminderPreference.deleteMany({ where: { userId: user.id } }),
    prisma.patientInsurance.deleteMany({ where: { userId: user.id } }),
    prisma.userNotification.deleteMany({ where: { recipientId: user.id } }),
    prisma.referralShare.updateMany({ where: { referral: { patientId: user.id }, revokedAt: null }, data: { revokedAt: now } }),
    ...(profileId
      ? [
          prisma.patientProfile.update({ where: { id: profileId }, data: { emergencyContact: null } }),
          prisma.appointment.updateMany({ where: { id: { in: upcoming.map((a) => a.id) } }, data: { status: "CANCELLED" } }),
        ]
      : []),
  ]);

  for (const a of upcoming) {
    await notify({ recipientId: a.practitioner.userId, type: "APPOINTMENT_UPDATED", title: "A consultation was cancelled", body: "The patient closed their NauriCare account, so this consultation was cancelled.", link: "/provider/schedule" });
  }
  await logAdministrativeAction({ action: "ACCOUNT_DELETED", actorId: user.id, targetId: user.id, details: { cancelledAppointments: upcoming.length }, ipAddress });
}
