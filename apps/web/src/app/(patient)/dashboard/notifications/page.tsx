"use client";

import { useState, useEffect } from "react";
import { Bell, AtSign, UserPlus, MessageCircle, Check } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/actions/notification";

type NotifType = "MENTION_POST" | "MENTION_COMMENT" | "FOLLOW";

interface Notification {
  id: string;
  type: NotifType;
  isRead: boolean;
  createdAt: string;
  actor: { id: string; name: string; avatarUrl: string | null; handle: string | null };
  post: { id: string; content: string } | null;
}

function notificationLabel(n: Notification): string {
  switch (n.type) {
    case "MENTION_POST":    return "mentioned you in a post";
    case "MENTION_COMMENT": return "mentioned you in a comment";
    case "FOLLOW":          return "started following you";
  }
}

function NotificationIcon({ type }: { type: NotifType }) {
  if (type === "FOLLOW")          return <UserPlus className="w-4 h-4 text-teal-600" />;
  if (type === "MENTION_COMMENT") return <MessageCircle className="w-4 h-4 text-blue-500" />;
  return <AtSign className="w-4 h-4 text-purple-500" />;
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNotifications()
      .then((res) => { if (res.success) setNotifications(res.data as unknown as Notification[]); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function handleMarkAll() {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  async function handleMarkOne(id: string) {
    await markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            <Check className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 bg-gray-200 rounded" />
                <div className="h-3 w-1/2 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No notifications yet</p>
          <p className="text-sm mt-1">When someone mentions you or follows you, it'll appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-xl border transition-colors ${!n.isRead ? "border-teal-100 bg-teal-50/30" : "border-gray-100"}`}
            >
              <div className="flex items-start gap-3 p-4">
                <Avatar name={n.actor.name} avatarUrl={n.actor.avatarUrl} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-relaxed">
                    <span className="font-semibold">{n.actor.name}</span>{" "}
                    <span className="text-gray-600">{notificationLabel(n)}</span>
                  </p>
                  {n.post && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 bg-gray-50 rounded-lg px-3 py-1.5">
                      &ldquo;{n.post.content.slice(0, 120)}{n.post.content.length > 120 ? "…" : ""}&rdquo;
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <NotificationIcon type={n.type} />
                    <span className="text-xs text-gray-400">{relTime(n.createdAt)}</span>
                  </div>
                </div>
                {!n.isRead && (
                  <button
                    onClick={() => handleMarkOne(n.id)}
                    aria-label="Mark as read"
                    className="shrink-0 w-2.5 h-2.5 bg-teal-500 rounded-full mt-1 hover:bg-teal-700 transition-colors"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
