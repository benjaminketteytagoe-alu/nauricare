"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, AtSign, UserPlus, MessageCircle, Check } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import {
  getNotifications,
  getUnreadCount,
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
    case "MENTION_POST":
      return "mentioned you in a post";
    case "MENTION_COMMENT":
      return "mentioned you in a comment";
    case "FOLLOW":
      return "started following you";
  }
}

function NotificationIcon({ type }: { type: NotifType }) {
  if (type === "FOLLOW") return <UserPlus className="w-3.5 h-3.5 text-teal-600" />;
  if (type === "MENTION_COMMENT") return <MessageCircle className="w-3.5 h-3.5 text-blue-500" />;
  return <AtSign className="w-3.5 h-3.5 text-purple-500" />;
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function NotificationBell({
  notificationsHref = "/dashboard/notifications",
}: {
  notificationsHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch unread count on mount (lightweight)
  useEffect(() => {
    getUnreadCount().then(setUnread).catch(() => {});
  }, []);

  // Load full list when dropdown opens (only once until refresh)
  useEffect(() => {
    if (!open || notifications.length > 0) return;
    setLoadingAll(true);
    getNotifications()
      .then((res) => {
        if (res.success) setNotifications(res.data as unknown as Notification[]);
      })
      .catch(() => {})
      .finally(() => setLoadingAll(false));
  }, [open, notifications.length]);

  async function handleMarkAll() {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  }

  async function handleMarkOne(id: string) {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnread((c) => Math.max(0, c - 1));
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className={`relative p-2 rounded-lg transition-colors hover:text-teal-600 ${open ? "bg-gray-100 text-teal-600" : ""}`}
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-xs text-teal-600 font-medium hover:underline"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loadingAll ? (
              <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" />
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.isRead ? "bg-teal-50/40" : ""}`}
                >
                  <Avatar name={n.actor.name} avatarUrl={n.actor.avatarUrl} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-800 leading-relaxed">
                      <span className="font-semibold">{n.actor.name}</span>{" "}
                      <span className="text-gray-600">{notificationLabel(n)}</span>
                    </p>
                    {n.post && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        "{n.post.content.slice(0, 60)}{n.post.content.length > 60 ? "…" : ""}"
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                        <NotificationIcon type={n.type} />
                        {relTime(n.createdAt)}
                      </span>
                    </div>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkOne(n.id)}
                      aria-label="Mark as read"
                      className="shrink-0 w-2 h-2 bg-teal-500 rounded-full mt-1.5 hover:bg-teal-700 transition-colors"
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-50 bg-gray-50/50 text-center">
            <Link
              href={notificationsHref}
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-teal-600 hover:text-teal-700"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
