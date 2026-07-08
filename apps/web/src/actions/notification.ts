"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getNotifications() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false as const, data: [] };

  const notifications = await prisma.userNotification.findMany({
    where: { recipientId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      actor: { select: { id: true, name: true, avatarUrl: true, handle: true } },
      post: { select: { id: true, content: true } },
    },
  });

  return { success: true as const, data: notifications };
}

export async function getUnreadCount(): Promise<number> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return 0;

  return prisma.userNotification.count({
    where: { recipientId: session.user.id, isRead: false },
  });
}

export async function markNotificationRead(notificationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  await prisma.userNotification.updateMany({
    where: { id: notificationId, recipientId: session.user.id },
    data: { isRead: true },
  });

  return { success: true };
}

export async function markAllNotificationsRead() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  await prisma.userNotification.updateMany({
    where: { recipientId: session.user.id, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/dashboard/notifications");
  return { success: true };
}
