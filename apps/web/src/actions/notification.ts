"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-guards";
import { idSchema } from "@/lib/validation/common";
import { NOTIFICATION_SELECT } from "@/server/notifications/notify";

export async function getNotifications(take = 50) {
  const user = await getSessionUser();
  if (!user) return { success: false as const, data: [] };
  const notifications = await prisma.userNotification.findMany({
    where: { recipientId: user.id },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(1, take), 100),
    select: NOTIFICATION_SELECT,
  });
  return { success: true as const, data: notifications };
}

export async function getUnreadCount(): Promise<number> {
  const user = await getSessionUser();
  if (!user) return 0;
  return prisma.userNotification.count({ where: { recipientId: user.id, isRead: false } });
}

export async function markNotificationRead(notificationId: string) {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Unauthorized" };
  if (!idSchema.safeParse(notificationId).success) return { success: false, error: "Invalid notification." };
  await prisma.userNotification.updateMany({ where: { id: notificationId, recipientId: user.id }, data: { isRead: true } });
  return { success: true };
}

export async function markAllNotificationsRead() {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Unauthorized" };
  await prisma.userNotification.updateMany({ where: { recipientId: user.id, isRead: false }, data: { isRead: true } });
  revalidatePath("/dashboard/notifications");
  return { success: true };
}
