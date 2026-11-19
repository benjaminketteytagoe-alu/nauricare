import { prisma } from "@/lib/prisma";

// Who may message whom (one rule for every messaging entry point):
//   * a patient may message any verified, active provider ("quick check-in");
//   * a provider may message a patient who has messaged them, or with whom
//     they share an appointment (providers can't cold-message patients);
//   * anything else (patient<->patient, admins) is not allowed.

const ONLINE_WINDOW_MS = 90_000;

export function isOnline(lastSeenAt: Date | null | undefined): boolean {
  return !!lastSeenAt && Date.now() - lastSeenAt.getTime() < ONLINE_WINDOW_MS;
}

export async function canMessage(senderId: string, receiverId: string): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  if (senderId === receiverId) return { allowed: false, reason: "You can't message yourself." };
  const [sender, receiver] = await Promise.all([
    prisma.user.findUnique({ where: { id: senderId }, select: { role: true } }),
    prisma.user.findUnique({ where: { id: receiverId }, select: { role: true, practitionerProfile: { select: { id: true, isVerified: true, isActive: true } }, patientProfile: { select: { id: true } } } }),
  ]);
  if (!sender || !receiver) return { allowed: false, reason: "That person isn't available." };

  if (sender.role === "PATIENT" && receiver.role === "PROVIDER") {
    const p = receiver.practitionerProfile;
    return p?.isVerified && p.isActive ? { allowed: true } : { allowed: false, reason: "This provider isn't available for messages." };
  }

  if (sender.role === "PROVIDER" && receiver.role === "PATIENT") {
    const patientWroteFirst = await prisma.directMessage.findFirst({ where: { senderId: receiverId, receiverId: senderId }, select: { id: true } });
    if (patientWroteFirst) return { allowed: true };
    const shared = receiver.patientProfile
      ? await prisma.appointment.findFirst({ where: { patientProfileId: receiver.patientProfile.id, practitioner: { userId: senderId } }, select: { id: true } })
      : null;
    return shared ? { allowed: true } : { allowed: false, reason: "You can message patients once they contact you or book with you." };
  }

  return { allowed: false, reason: "Messaging is available between patients and providers." };
}
