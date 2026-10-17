"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { rateLimit } from "@/lib/rateLimit";
import { sanitizePlainText } from "@/lib/sanitize";
import { idSchema } from "@/lib/validation/common";

const MESSAGE_MAX = 4000;
const SendInput = z.object({ receiverId: idSchema, content: z.string().max(MESSAGE_MAX, `Messages must be under ${MESSAGE_MAX} characters.`) });

// Returns true when the two users share at least one appointment (either direction).
async function hasSharedAppointment(userA: string, userB: string): Promise<boolean> {
  // userA/userB may be either the patient (User.id → PatientProfile) or
  // the provider (User.id → PractitionerProfile).
  const [profileA, profileB] = await Promise.all([
    prisma.patientProfile.findUnique({ where: { userId: userA }, select: { id: true } }),
    prisma.patientProfile.findUnique({ where: { userId: userB }, select: { id: true } }),
  ]);

  // Attempt patient-A ↔ provider-B
  const [practA, practB] = await Promise.all([
    prisma.practitionerProfile.findUnique({ where: { userId: userA }, select: { id: true } }),
    prisma.practitionerProfile.findUnique({ where: { userId: userB }, select: { id: true } }),
  ]);

  const checks: Promise<number>[] = [];

  if (profileA && practB) {
    checks.push(
      prisma.appointment.count({
        where: { patientProfileId: profileA.id, practitionerProfileId: practB.id },
      }),
    );
  }
  if (profileB && practA) {
    checks.push(
      prisma.appointment.count({
        where: { patientProfileId: profileB.id, practitionerProfileId: practA.id },
      }),
    );
  }

  if (checks.length === 0) return false;
  const counts = await Promise.all(checks);
  return counts.some((c) => c > 0);
}

export async function getConversations() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized", data: [] };

  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [{ senderId: session.user.id }, { receiverId: session.user.id }],
    },
    include: {
      sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
      receiver: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const seen = new Set<string>();
  const conversations = messages
    .filter((m) => {
      const partnerId = m.senderId === session.user.id ? m.receiverId : m.senderId;
      if (seen.has(partnerId)) return false;
      seen.add(partnerId);
      return true;
    })
    .map((m) => {
      const partner = m.senderId === session.user.id ? m.receiver : m.sender;
      return {
        partnerId: partner.id,
        partnerName: partner.name,
        partnerEmail: partner.email,
        partnerAvatarUrl: partner.avatarUrl,
        lastMessage: m.content,
        lastMessageAt: m.createdAt,
        isRead: m.senderId === session.user.id ? true : m.isRead,
      };
    });

  return { success: true, data: conversations };
}

export async function getDirectMessages(contactId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized", data: [] };
  if (!idSchema.safeParse(contactId).success) return { success: false, error: "Invalid contact.", data: [] };

  const allowed = await hasSharedAppointment(session.user.id, contactId);
  if (!allowed) return { success: false, error: "No shared appointment with this user.", data: [] };

  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: session.user.id, receiverId: contactId },
        { senderId: contactId, receiverId: session.user.id },
      ],
    },
    include: { sender: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  // Mark incoming unread messages as read
  await prisma.directMessage.updateMany({
    where: { senderId: contactId, receiverId: session.user.id, isRead: false },
    data: { isRead: true },
  });

  return { success: true, data: messages };
}

export async function sendDirectMessage(receiverId: string, content: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const parsed = SendInput.safeParse({ receiverId, content });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid message." };

  const limit = rateLimit(`dm-send:${session.user.id}`, 30, 60_000);
  if (!limit.allowed) return { success: false, error: "You're sending messages too quickly. Please wait a moment." };

  const trimmed = sanitizePlainText(parsed.data.content);
  if (!trimmed) return { success: false, error: "Message cannot be empty" };

  const allowed = await hasSharedAppointment(session.user.id, receiverId);
  if (!allowed) {
    return { success: false, error: "You can only message users with whom you have a shared appointment." };
  }

  const message = await prisma.directMessage.create({
    data: { senderId: session.user.id, receiverId, content: trimmed },
    include: { sender: { select: { id: true, name: true } } },
  });

  revalidatePath("/provider/messages");
  revalidatePath("/dashboard/messages");
  return { success: true, data: message };
}
