"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { AppSidebar, SidebarAction, SidebarMobileTrigger, SidebarProvider, type NavItem } from "@/components/navigation/AppSidebar";
import { useState } from "react";
import {
  LayoutDashboard, Stethoscope, Store, ShieldAlert, LogOut,
  Settings, Bell, User, Lock, Sliders, CheckCircle, AlertTriangle, MessageSquareHeart
} from "lucide-react";

const navItems: NavItem[] = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Providers", href: "/admin/providers", icon: Stethoscope },
  { name: "Pharmacies", href: "/admin/pharmacies", icon: Store },
  { name: "Feedback", href: "/admin/feedback", icon: MessageSquareHeart },
  { name: "Audit Logs", href: "/admin/audit", icon: ShieldAlert },
];

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  return (
    <SidebarProvider>
    <div className="flex min-h-screen bg-gray-50">
      <AppSidebar
        items={navItems}
        homeHref="/admin"
        portalLabel="Admin Console"
        tone="dark"
        footer={(iconOnly) => (
            <SidebarAction icon={LogOut} label="Sign Out" onClick={() => signOut({ callbackUrl: "/login" })} tone="dark" collapsed={iconOnly} />
        )}
      />

      <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm lg:justify-end lg:px-8">
          <SidebarMobileTrigger className="text-gray-500 hover:bg-gray-100 hover:text-teal-600" />
          <div className="flex items-center gap-4 text-gray-500">

            <div className="relative">
              <button
                onClick={() => { setShowNotifications(!showNotifications); setShowSettings(false); }}
                className={`hover:text-teal-600 transition-colors relative p-2 rounded-lg ${showNotifications ? 'bg-gray-100 text-teal-600' : ''}`}
              >
                <Bell className="w-5 h-5" />
                {hasUnread && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    {hasUnread && (
                      <button onClick={() => setHasUnread(false)} className="text-xs text-teal-600 font-medium hover:underline focus:outline-none">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    <div className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors flex gap-3 cursor-pointer ${!hasUnread ? 'opacity-60' : ''}`}>
                      <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Provider Onboarded</p>
                        <p className="text-xs text-gray-500 mt-0.5">A new specialist has been successfully verified and added to the roster.</p>
                        <p className="text-[10px] text-gray-400 mt-1.5 font-medium uppercase tracking-wider">Just now</p>
                      </div>
                    </div>
                    <div className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors flex gap-3 cursor-pointer ${!hasUnread ? 'opacity-60' : ''}`}>
                      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">System Ready</p>
                        <p className="text-xs text-gray-500 mt-0.5">The NauriCare administrative dashboard has been fully initialized.</p>
                        <p className="text-[10px] text-gray-400 mt-1.5 font-medium uppercase tracking-wider">2 hours ago</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border-t border-gray-50 bg-gray-50/50 text-center">
                    <Link href="/admin/audit" onClick={() => setShowNotifications(false)} className="text-xs font-medium text-teal-600 hover:text-teal-700 block w-full">
                      View All Activity
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => { setShowSettings(!showSettings); setShowNotifications(false); }}
                className={`hover:text-teal-600 transition-colors flex items-center gap-2 text-sm font-medium p-2 rounded-lg ${showSettings ? 'bg-gray-100 text-teal-600' : ''}`}
              >
                <Settings className="w-5 h-5" />
                Settings
              </button>
              {showSettings && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="p-2 space-y-1">
                    <Link href="/admin/settings" onClick={() => setShowSettings(false)} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors">
                      <User className="w-4 h-4" />
                      Admin Profile
                    </Link>
                    <Link href="/admin/settings" onClick={() => setShowSettings(false)} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors">
                      <Lock className="w-4 h-4" />
                      Security & Access
                    </Link>
                    <Link href="/admin/settings" onClick={() => setShowSettings(false)} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors">
                      <Sliders className="w-4 h-4" />
                      System Preferences
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
    </SidebarProvider>
  );
}
