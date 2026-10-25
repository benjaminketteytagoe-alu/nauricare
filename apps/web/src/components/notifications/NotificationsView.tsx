"use client";

import { Bell, Check } from "lucide-react";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { useNotifications } from "@/components/notifications/useNotifications";
import { useRealtimeStatus } from "@/components/realtime/RealtimeProvider";

export function NotificationsView() {
  const { unread, items, markOne, markAll } = useNotifications({ listEnabled: true, take: 100 });
  const live = useRealtimeStatus();

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-nc-ink sm:text-3xl"><Bell className="h-7 w-7 text-rose-600" aria-hidden /> Notifications</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
            <span className={`h-2 w-2 rounded-full ${live ? "bg-emerald-500" : "bg-slate-300"}`} aria-hidden />
            {live ? "Live: bookings, messages and other updates appear instantly." : "Connecting for live updates…"}
          </p>
        </div>
        {unread > 0 && (
          <button type="button" onClick={markAll} className="m3-btn-outlined"><Check className="h-4 w-4" aria-hidden /> Mark all read ({unread})</button>
        )}
      </header>

      <div className="card-surface divide-y divide-slate-100 overflow-hidden">
        {items === null ? (
          <p className="p-10 text-center text-sm text-slate-500">Loading…</p>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="mx-auto h-10 w-10 text-slate-300" aria-hidden />
            <p className="mt-3 font-semibold text-nc-ink">You&apos;re all caught up</p>
            <p className="mt-1 text-sm text-slate-500">Bookings, messages and other updates will show up here.</p>
          </div>
        ) : (
          items.map((n) => <NotificationItem key={n.id} n={n} onRead={markOne} />)
        )}
      </div>
    </div>
  );
}
