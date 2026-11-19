import type { UserNotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publish } from "@/server/realtime/bus";

// The single entry point for in-app notifications. Every feature (bookings,
// messages, community, referrals, reminders) calls this; it stores the
// notification and pushes it live to the recipient's open tabs. Failures are
// logged, never thrown: a notification must not break the action behind it.

export interface NotifyInput {
  recipientId: string;
  type: UserNotificationType;
  actorId?: string | null;
  title?: string;
  body?: string;
  link?: string;
  postId?: string;
  commentId?: string;
}

/** Store and push a notification; throws on failure (for callers that track delivery). */
export async function notifyOrThrow(input: NotifyInput): Promise<void> {
  if (input.actorId && input.actorId === input.recipientId) return; // never notify yourself
  const n = await prisma.userNotification.create({
    data: {
      recipientId: input.recipientId,
      actorId: input.actorId ?? null,
      type: input.type,
      title: input.title?.slice(0, 140),
      body: input.body?.slice(0, 300),
      link: input.link?.startsWith("/") ? input.link.slice(0, 300) : null,
      postId: input.postId,
      commentId: input.commentId,
    },
    select: { id: true },
  });
  publish(input.recipientId, { type: "notification", id: n.id });
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    await notifyOrThrow(input);
  } catch (error) {
    console.error(`[NOTIFY] ${input.type} failed:`, error instanceof Error ? error.message : error);
  }
}

/** Shape returned to clients by the notification list endpoints. */
export const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  isRead: true,
  createdAt: true,
  title: true,
  body: true,
  link: true,
  actor: { select: { id: true, name: true, avatarUrl: true, handle: true } },
  post: { select: { id: true, content: true } },
} as const;
