"use client";

import { useCallback, useEffect, useState } from "react";
import type { UserNotificationType } from "@prisma/client";
import { getNotifications, getUnreadCount, markAllNotificationsRead, markNotificationRead } from "@/actions/notification";
import { useRealtime } from "@/components/realtime/RealtimeProvider";

export interface NotificationView {
  id: string;
  type: UserNotificationType;
  isRead: boolean;
  createdAt: string | Date;
  title: string | null;
  body: string | null;
  link: string | null;
  actor: { id: string; name: string; avatarUrl: string | null; handle: string | null } | null;
  post: { id: string; content: string } | null;
}

/**
 * Shared notification state for the bell and the notifications page. The
 * unread count loads eagerly; the list loads when `listEnabled` is true. Live
 * "notification" events refresh both.
 */
export function useNotifications({ listEnabled, take = 50 }: { listEnabled: boolean; take?: number }) {
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationView[] | null>(null);

  const refreshUnread = useCallback(() => getUnreadCount().then(setUnread).catch(() => {}), []);
  const refreshList = useCallback(
    () =>
      getNotifications(take)
        .then((res) => {
          if (res.success) setItems(res.data as unknown as NotificationView[]);
        })
        .catch(() => {}),
    [take],
  );

  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread]);

  useEffect(() => {
    if (listEnabled && items === null) void refreshList();
  }, [listEnabled, items, refreshList]);

  useRealtime("notification", () => {
    void refreshUnread();
    if (items !== null) void refreshList();
  });

  // Reading a conversation marks its message notifications read server-side.
  useRealtime("message", () => {
    void refreshUnread();
  });

  const markOne = useCallback(async (id: string) => {
    await markNotificationRead(id);
    setItems((prev) => prev?.map((n) => (n.id === id ? { ...n, isRead: true } : n)) ?? prev);
    setUnread((c) => Math.max(0, c - 1));
  }, []);

  const markAll = useCallback(async () => {
    await markAllNotificationsRead();
    setItems((prev) => prev?.map((n) => ({ ...n, isRead: true })) ?? prev);
    setUnread(0);
  }, []);

  return { unread, items, markOne, markAll, refresh: refreshList };
}
