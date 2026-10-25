"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "next-auth/react";
import {
  Activity, Calendar, Droplet, FileText, Hospital, LayoutDashboard, LogOut, MessageSquare, MessageSquarePlus, Pill, Settings, Users,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { PendingTriageBanner } from "@/components/triage-gate/PendingTriageBanner";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";
import { AppSidebar, SidebarAction, SidebarMobileTrigger, SidebarProvider, type NavItem } from "@/components/navigation/AppSidebar";

const PATIENT_NAV: NavItem[] = [
  { name: "My Health", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Cycle", href: "/dashboard/cycle", icon: Droplet },
  { name: "Symptom Guide", href: "/dashboard/symptoms", icon: Activity },
  { name: "Consultations", href: "/dashboard/providers", icon: Calendar },
  { name: "My Records", href: "/dashboard/records", icon: FileText },
  { name: "Referrals", href: "/dashboard/referrals", icon: Hospital },
  { name: "Prescriptions", href: "/dashboard/prescriptions", icon: Pill },
  { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { name: "Community", href: "/dashboard/community", icon: Users },
  { name: "Feedback", href: "/dashboard/feedback", icon: MessageSquarePlus },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

/** Patient portal chrome: mobile top bar, collapsible sidebar and scrolling content area. */
export function PatientShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <RealtimeProvider>
      <div className="app-shell-canvas flex">
        {/* Mobile-only top bar */}
        <div className="nav-glass fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b px-4 lg:hidden">
          <Link href="/dashboard" className="transition-opacity hover:opacity-80" aria-label="NauriCare home">
            <Image src="/logo-horizontal.jpg" alt="NauriCare" width={140} height={36} className="h-8 w-auto object-contain" priority />
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <SidebarMobileTrigger className="text-slate-500 hover:bg-rose-50 hover:text-rose-600" />
          </div>
        </div>

        <AppSidebar
          items={PATIENT_NAV}
          homeHref="/dashboard"
          portalLabel="Patient Portal"
          tone="light"
          footer={(iconOnly) => (
            <>
              <div className={`hidden items-center gap-3 px-3 py-2 text-slate-600 lg:flex ${iconOnly ? "justify-center px-0" : ""}`}>
                <NotificationBell />
                {!iconOnly && <span className="text-sm font-medium">Notifications</span>}
              </div>
              <SidebarAction icon={LogOut} label="Sign Out" onClick={() => signOut({ callbackUrl: "/login" })} tone="light" collapsed={iconOnly} />
            </>
          )}
        />

        <main className="flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden lg:h-screen">
          {/* pt-20 clears the fixed mobile top bar (h-16) with breathing room */}
          <div className="flex-1 overflow-y-auto p-4 pt-20 lg:p-8">
            <PendingTriageBanner />
            {children}
          </div>
        </main>
      </div>
      </RealtimeProvider>
    </SidebarProvider>
  );
}
