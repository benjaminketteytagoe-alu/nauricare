"use client";

import Link from "next/link";
import {
  AtSign, Bell, CalendarCheck, CalendarClock, Droplet, Heart, Hospital, MessageCircle, MessageSquare, UserPlus, type LucideIcon,
} from "lucide-react";
import type { UserNotificationType } from "@prisma/client";
import { Avatar } from "@/components/Avatar";
import { formatRelative } from "@/lib/format";
import type { NotificationView } from "./useNotifications";

const ICONS: Record<UserNotificationType, { icon: LucideIcon; color: string }> = {
  MENTION_POST: { icon: AtSign, color: "text-purple-500" },
  MENTION_COMMENT: { icon: AtSign, color: "text-purple-500" },
  FOLLOW: { icon: UserPlus, color: "text-rose-600" },
  MESSAGE: { icon: MessageSquare, color: "text-nc-primary" },
  APPOINTMENT_BOOKED: { icon: CalendarCheck, color: "text-emerald-600" },
  APPOINTMENT_UPDATED: { icon: CalendarCheck, color: "text-emerald-600" },
  APPOINTMENT_REMINDER: { icon: CalendarClock, color: "text-nc-amber" },
  COMMUNITY_LIKE: { icon: Heart, color: "text-rose-500" },
  COMMUNITY_COMMENT: { icon: MessageCircle, color: "text-blue-500" },
  REFERRAL_UPDATE: { icon: Hospital, color: "text-nc-amber" },
  PERIOD_REMINDER: { icon: Droplet, color: "text-rose-500" },
  SYSTEM: { icon: Bell, color: "text-slate-500" },
};

const LEGACY_TEXT: Partial<Record<UserNotificationType, string>> = {
  MENTION_POST: "mentioned you in a post",
  MENTION_COMMENT: "mentioned you in a comment",
  FOLLOW: "started following you",
};

/** One notification row; used by the bell dropdown and the notifications page. */
export function NotificationItem({ n, onRead, compact = false }: { n: NotificationView; onRead: (id: string) => void; compact?: boolean }) {
  const { icon: Icon, color } = ICONS[n.type] ?? ICONS.SYSTEM;
  const title = n.title ?? (n.actor ? `${n.actor.name} ${LEGACY_TEXT[n.type] ?? ""}`.trim() : "Notification");
  const body = n.body ?? (n.post ? `“${n.post.content.slice(0, 80)}${n.post.content.length > 80 ? "…" : ""}”` : null);

  const content = (
    <>
      {n.actor ? (
        <Avatar name={n.actor.name} avatarUrl={n.actor.avatarUrl} size="sm" />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100"><Icon className={`h-4 w-4 ${color}`} aria-hidden /></span>
      )}
      <span className="min-w-0 flex-1">
        <span className={`block leading-snug text-gray-900 ${compact ? "text-xs" : "text-sm"} ${n.isRead ? "" : "font-semibold"}`}>{title}</span>
        {body && <span className={`mt-0.5 block truncate text-gray-500 ${compact ? "text-xs" : "text-sm"}`}>{body}</span>}
        <span className="mt-1 flex items-center gap-1 text-[11px] text-gray-400"><Icon className={`h-3 w-3 ${color}`} aria-hidden />{formatRelative(n.createdAt, true)}</span>
      </span>
    </>
  );

  return (
    <div className={`flex items-start gap-3 ${compact ? "px-4 py-3" : "p-4"} ${n.isRead ? "" : "bg-nc-primary-container/40"}`}>
      {n.link ? (
        <Link href={n.link} onClick={() => !n.isRead && onRead(n.id)} className="flex min-w-0 flex-1 items-start gap-3 hover:opacity-90">{content}</Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-3">{content}</div>
      )}
      {!n.isRead && (
        <button type="button" onClick={() => onRead(n.id)} aria-label="Mark as read" className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-nc-primary hover:ring-4 hover:ring-nc-primary/20" />
      )}
    </div>
  );
}
