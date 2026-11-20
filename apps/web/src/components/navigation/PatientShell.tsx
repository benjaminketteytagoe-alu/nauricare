"use client";

import {
  BookOpen,
  Calendar,
  Droplet,
  FileText,
  Home,
  Hospital,
  LogOut,
  MessageCircleHeart,
  MessageSquare,
  MessageSquarePlus,
  Pill,
  Settings,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import type { ReactNode } from "react";
import { IdleGuard } from "@/components/auth/IdleGuard";
import {
  AppSidebar,
  SidebarAction,
  SidebarMobileTrigger,
  SidebarProvider,
  type NavSection,
} from "@/components/navigation/AppSidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";
import { PendingTriageBanner } from "@/components/triage-gate/PendingTriageBanner";

// Grouped by what the patient is doing: tracking their own health, getting
// care from someone, or learning and connecting.
const PATIENT_NAV: NavSection[] = [
  { items: [{ name: "Today", href: "/dashboard", icon: Home }] },
  {
    label: "Your health",
    items: [
      { name: "Ask Nauri", href: "/dashboard/symptoms", icon: MessageCircleHeart },
      { name: "Cycle", href: "/dashboard/cycle", icon: Droplet },
      { name: "Records", href: "/dashboard/records", icon: FileText },
      { name: "Prescriptions", href: "/dashboard/prescriptions", icon: Pill },
    ],
  },
  {
    label: "Your care",
    items: [
      { name: "Consultations", href: "/dashboard/providers", icon: Calendar },
      { name: "Referrals", href: "/dashboard/referrals", icon: Hospital },
      { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
    ],
  },
  {
    label: "Learn & connect",
    items: [
      { name: "Learn", href: "/dashboard/articles", icon: BookOpen },
      { name: "Community", href: "/dashboard/community", icon: Users },
    ],
  },
  {
    label: "Account",
    items: [
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
      { name: "Feedback", href: "/dashboard/feedback", icon: MessageSquarePlus },
    ],
  },
];

/** Patient portal chrome: mobile top bar, collapsible sidebar and scrolling content area. */
export function PatientShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <IdleGuard />
      <RealtimeProvider>
        <div className="flex min-h-screen bg-canvas">
          {/* Mobile-only top bar */}
          <div className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-hairline bg-surface/95 px-4 backdrop-blur lg:hidden">
            <Link href="/dashboard" className="transition-opacity hover:opacity-80" aria-label="NauriCare home">
              <Image
                src="/logo-horizontal.jpg"
                alt="NauriCare"
                width={140}
                height={36}
                className="h-8 w-auto object-contain"
                priority
              />
            </Link>
            <div className="flex items-center gap-1">
              <NotificationBell />
              <SidebarMobileTrigger />
            </div>
          </div>

          <AppSidebar
            sections={PATIENT_NAV}
            homeHref="/dashboard"
            portalLabel="Patient Portal"
            tone="light"
            footer={(iconOnly) => (
              <>
                <div
                  className={`hidden items-center gap-3 px-3 py-2 text-ink-soft lg:flex ${iconOnly ? "justify-center px-0" : ""}`}
                >
                  <NotificationBell />
                  {!iconOnly && <span className="text-sm font-medium">Notifications</span>}
                </div>
                <SidebarAction
                  icon={LogOut}
                  label="Sign out"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  tone="light"
                  collapsed={iconOnly}
                />
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
