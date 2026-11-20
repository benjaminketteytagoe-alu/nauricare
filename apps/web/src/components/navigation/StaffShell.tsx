"use client";

import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { ReactNode } from "react";
import { IdleGuard } from "@/components/auth/IdleGuard";
import {
  AppSidebar,
  SidebarAction,
  SidebarMobileTrigger,
  SidebarProvider,
  type NavItem,
} from "@/components/navigation/AppSidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";
import { cn } from "@/lib/utils";

/** The provider and admin portals: dark sidebar, top bar with notifications and settings. */
export function StaffShell({
  items,
  home,
  label,
  children,
}: {
  items: NavItem[];
  /** Portal root, e.g. "/admin"; settings and notifications live under it. */
  home: "/admin" | "/provider";
  label: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const settingsHref = `${home}/settings`;
  const onSettings = pathname === settingsHref || pathname.startsWith(`${settingsHref}/`);

  return (
    <SidebarProvider>
      <IdleGuard />
      <RealtimeProvider>
        <div className="flex min-h-screen bg-canvas">
          <AppSidebar
            sections={[{ items }]}
            homeHref={home}
            portalLabel={label}
            tone="dark"
            footer={(iconOnly) => (
              <SidebarAction
                icon={LogOut}
                label="Sign out"
                onClick={() => signOut({ callbackUrl: "/login" })}
                tone="dark"
                collapsed={iconOnly}
              />
            )}
          />

          <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
            <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-hairline bg-surface px-4 lg:justify-end lg:px-8">
              <SidebarMobileTrigger />
              <div className="flex items-center gap-2 text-ink-soft">
                <NotificationBell notificationsHref={`${home}/notifications`} />
                <Link
                  href={settingsHref}
                  aria-current={onSettings ? "page" : undefined}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors hover:bg-surface-muted hover:text-ink",
                    onSettings && "bg-brand-soft text-brand-ink",
                  )}
                >
                  <Settings className="size-5" aria-hidden />
                  <span className="hidden sm:inline">Settings</span>
                  <span className="sr-only sm:hidden">Settings</span>
                </Link>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</div>
          </main>
        </div>
      </RealtimeProvider>
    </SidebarProvider>
  );
}
