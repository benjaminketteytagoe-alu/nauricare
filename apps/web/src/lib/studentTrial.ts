import { prisma } from "@/lib/prisma";
import { getEmailDomain, isAcademicEmail } from "@/lib/academicEmail";
import { STUDENT_TRIAL_MONTHS } from "@/lib/pricing";

/**
 * Grants the one-time 3-month student trial if `email` matches an academic
 * domain and this user has never been granted one before. Idempotent and
 * safe to call from multiple verification paths (token-based email
 * verification, magic-link sign-in) — `studentTrialGrantedAt` on User is the
 * permanent gate, independent of the Subscription row's own lifecycle, so a
 * lapsed/cancelled trial can never be re-granted.
 */
export async function grantStudentTrialIfEligible(userId: string, email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { studentTrialGrantedAt: true },
  });

  if (!user || user.studentTrialGrantedAt || !isAcademicEmail(email)) {
    return false;
  }

  const now = new Date();
  const trialEndsAt = new Date(now);
  trialEndsAt.setMonth(trialEndsAt.getMonth() + STUDENT_TRIAL_MONTHS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        studentTrialGrantedAt: now,
        studentTrialEmailDomain: getEmailDomain(email),
      },
    }),
    prisma.subscription.upsert({
      where: { userId },
      create: { userId, status: "TRIALING", trialStartedAt: now, trialEndsAt },
      update: { status: "TRIALING", trialStartedAt: now, trialEndsAt },
    }),
  ]);

  return true;
}
