"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { AppSidebar, SidebarAction, SidebarMobileTrigger, SidebarProvider, type NavItem } from "@/components/navigation/AppSidebar";
import { useState } from "react";
import {
  Activity, Users, Calendar, MessageSquare, MessageSquarePlus, LogOut,
  Settings, User, Lock, Sliders, Pill,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";

const navItems: NavItem[] = [
  { name: "Clinical Dashboard", href: "/provider",               icon: Activity },
  { name: "Patient Roster",     href: "/provider/roster",        icon: Users },
  { name: "Appointments",       href: "/provider/schedule",      icon: Calendar },
  { name: "Prescriptions",      href: "/provider/prescriptions", icon: Pill },
  { name: "Messages",           href: "/provider/messages",      icon: MessageSquare },
  { name: "Feedback",           href: "/provider/feedback",      icon: MessageSquarePlus },
];

export default function ProviderLayoutClient({ children }: { children: React.ReactNode }) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <SidebarProvider>
    <RealtimeProvider>
    <div className="flex min-h-screen bg-gray-50">
      <AppSidebar
        items={navItems}
        homeHref="/provider"
        portalLabel="Clinical Portal"
        tone="dark"
        footer={(iconOnly) => (
            <>
              <SidebarAction icon={LogOut} label="Sign Out" onClick={() => signOut({ callbackUrl: "/login" })} tone="dark" collapsed={iconOnly} />
            </>
        )}
      />

      <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm lg:justify-end lg:px-8">
          <SidebarMobileTrigger className="text-gray-500 hover:bg-gray-100 hover:text-teal-600" />
          <div className="flex items-center gap-4 text-gray-500">

            <NotificationBell notificationsHref="/provider/notifications" />

            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`hover:text-teal-600 transition-colors flex items-center gap-2 text-sm font-medium p-2 rounded-lg ${showSettings ? 'bg-gray-100 text-teal-600' : ''}`}
              >
                <Settings className="w-5 h-5" />
                Settings
              </button>
              {showSettings && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="p-2 space-y-1">
                    <Link href="/provider/settings" onClick={() => setShowSettings(false)} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors">
                      <User className="w-4 h-4" />
                      Practitioner Profile
                    </Link>
                    <Link href="/provider/settings" onClick={() => setShowSettings(false)} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors">
                      <Lock className="w-4 h-4" />
                      Security
                    </Link>
                    <Link href="/provider/settings" onClick={() => setShowSettings(false)} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors">
                      <Sliders className="w-4 h-4" />
                      Consultation Preferences
                    </Link>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
    </RealtimeProvider>
    </SidebarProvider>
  );
}
