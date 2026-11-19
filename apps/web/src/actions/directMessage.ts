"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-guards";
import { rateLimit } from "@/lib/rateLimit";
import { sanitizePlainText } from "@/lib/sanitize";
import { idSchema } from "@/lib/validation/common";
import { canMessage, isOnline } from "@/server/messaging/policy";
import { notify } from "@/server/notifications/notify";
import { publish } from "@/server/realtime/bus";

const MESSAGE_MAX = 4000;
const SendInput = z.object({
  receiverId: idSchema,
  content: z.string().max(MESSAGE_MAX, `Messages must be under ${MESSAGE_MAX} characters.`),
});

const PARTNER_SELECT = {
  id: true,
  name: true,
  avatarUrl: true,
  role: true,
  lastSeenAt: true,
  practitionerProfile: { select: { specialty: true, clinicName: true } },
} as const;

export async function getConversations() {
  const user = await getSessionUser();
  if (!user) return { success: false as const, error: "Unauthorized", data: [] };

  const messages = await prisma.directMessage.findMany({
    where: { OR: [{ senderId: user.id }, { receiverId: user.id }] },
    include: { sender: { select: PARTNER_SELECT }, receiver: { select: PARTNER_SELECT } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const seen = new Set<string>();
  const conversations = [];
  for (const m of messages) {
    const partner = m.senderId === user.id ? m.receiver : m.sender;
    if (seen.has(partner.id)) continue;
    seen.add(partner.id);
    conversations.push({
      partnerId: partner.id,
      partnerName: partner.name,
      partnerAvatarUrl: partner.avatarUrl,
      partnerRole: partner.role,
      partnerSubtitle: partner.practitionerProfile ? `${partner.practitionerProfile.specialty} · ${partner.practitionerProfile.clinicName}` : null,
      online: isOnline(partner.lastSeenAt),
      lastMessage: m.content,
      lastMessageAt: m.createdAt,
      isRead: m.senderId === user.id ? true : m.isRead,
    });
  }
  return { success: true as const, data: conversations };
}

/** Verified providers a patient can start a conversation with, online first. */
export async function getMessageableProviders() {
  const user = await getSessionUser();
  if (!user || user.role !== "PATIENT") return { success: false as const, error: "Unauthorized", data: [] };
  const providers = await prisma.user.findMany({
    where: { role: "PROVIDER", practitionerProfile: { isVerified: true, isActive: true } },
    select: PARTNER_SELECT,
    orderBy: [{ lastSeenAt: { sort: "desc", nulls: "last" } }, { name: "asc" }],
    take: 100,
  });
  return {
    success: true as const,
    data: providers.map((p) => ({
      id: p.id,
      name: p.name,
      avatarUrl: p.avatarUrl,
      subtitle: p.practitionerProfile ? `${p.practitionerProfile.specialty} · ${p.practitionerProfile.clinicName}` : null,
      online: isOnline(p.lastSeenAt),
    })),
  };
}

export async function getDirectMessages(contactId: string) {
  const user = await getSessionUser();
  if (!user) return { success: false as const, error: "Unauthorized", data: [] };
  if (!idSchema.safeParse(contactId).success) return { success: false as const, error: "Invalid contact.", data: [] };

  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: user.id, receiverId: contactId },
        { senderId: contactId, receiverId: user.id },
      ],
    },
    include: { sender: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
    take: 300,
  });
  // A thread is readable if it already exists, or if the user is allowed to start one.
  if (messages.length === 0) {
    const gate = await canMessage(user.id, contactId);
    if (!gate.allowed) return { success: false as const, error: gate.reason, data: [] };
  }

  await prisma.directMessage.updateMany({
    where: { senderId: contactId, receiverId: user.id, isRead: false },
    data: { isRead: true },
  });
  await prisma.userNotification.updateMany({
    where: { recipientId: user.id, actorId: contactId, type: "MESSAGE", isRead: false },
    data: { isRead: true },
  });
  return { success: true as const, data: messages };
}

export async function sendDirectMessage(receiverId: string, content: string) {
  const user = await getSessionUser();
  if (!user) return { success: false as const, error: "Unauthorized" };

  const parsed = SendInput.safeParse({ receiverId, content });
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid message." };

  const limit = rateLimit(`dm-send:${user.id}`, 30, 60_000);
  if (!limit.allowed) return { success: false as const, error: "You're sending messages too quickly. Please wait a moment." };

  const trimmed = sanitizePlainText(parsed.data.content);
  if (!trimmed) return { success: false as const, error: "Message cannot be empty" };

  const gate = await canMessage(user.id, receiverId);
  if (!gate.allowed) return { success: false as const, error: gate.reason };

  const message = await prisma.directMessage.create({
    data: { senderId: user.id, receiverId, content: trimmed },
    include: { sender: { select: { id: true, name: true } } },
  });

  const event = {
    type: "message" as const,
    id: message.id,
    senderId: message.senderId,
    receiverId: message.receiverId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    sender: message.sender,
  };
  publish(receiverId, event);
  publish(user.id, event); // the sender's other open tabs

  // One unread "new message" notification per conversation, not one per message.
  const pending = await prisma.userNotification.findFirst({
    where: { recipientId: receiverId, actorId: user.id, type: "MESSAGE", isRead: false },
    select: { id: true },
  });
  if (!pending) {
    const receiverRole = (await prisma.user.findUnique({ where: { id: receiverId }, select: { role: true } }))?.role;
    await notify({
      recipientId: receiverId,
      actorId: user.id,
      type: "MESSAGE",
      title: `New message from ${user.name ?? "someone"}`,
      body: trimmed.slice(0, 140),
      link: `${receiverRole === "PROVIDER" ? "/provider" : "/dashboard"}/messages?with=${user.id}`,
    });
  }

  return { success: true as const, data: message };
}
