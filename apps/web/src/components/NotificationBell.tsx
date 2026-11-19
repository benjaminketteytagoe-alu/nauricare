"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { useNotifications } from "@/components/notifications/useNotifications";

export function NotificationBell({ notificationsHref = "/dashboard/notifications" }: { notificationsHref?: string }) {
  const [open, setOpen] = useState(false);
  const { unread, items, markOne, markAll } = useNotifications({ listEnabled: open, take: 20 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className={`relative rounded-lg p-2 transition-colors hover:text-nc-primary ${open ? "bg-gray-100 text-nc-primary" : ""}`}
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-0.5 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 sm:absolute sm:inset-x-auto sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="flex items-center gap-1 text-xs font-medium text-nc-primary hover:underline">
                <Check className="h-3 w-3" aria-hidden /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[60vh] divide-y divide-gray-50 overflow-y-auto">
            {items === null ? (
              <p className="py-8 text-center text-sm text-gray-400">Loading…</p>
            ) : items.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400"><Bell className="mx-auto mb-2 h-6 w-6 opacity-30" aria-hidden />No notifications yet</p>
            ) : (
              items.map((n) => <NotificationItem key={n.id} n={n} onRead={markOne} compact />)
            )}
          </div>
          <div className="border-t border-gray-50 bg-gray-50/60 p-3 text-center">
            <Link href={notificationsHref} onClick={() => setOpen(false)} className="text-xs font-medium text-nc-primary hover:underline">View all notifications</Link>
          </div>
        </div>
      )}
    </div>
  );
}
