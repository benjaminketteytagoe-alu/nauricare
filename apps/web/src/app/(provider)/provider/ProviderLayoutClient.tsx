"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import {
  Activity, Users, Calendar, MessageSquare, LogOut,
  Settings, User, Lock, Sliders, Pill,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";

const navItems = [
  { name: "Clinical Dashboard", href: "/provider",               icon: Activity },
  { name: "Patient Roster",     href: "/provider/roster",        icon: Users },
  { name: "Appointments",       href: "/provider/schedule",      icon: Calendar },
  { name: "Prescriptions",      href: "/provider/prescriptions", icon: Pill },
  { name: "Messages",           href: "/provider/messages",      icon: MessageSquare },
];

export default function ProviderLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-teal-900 text-teal-50 flex flex-col shadow-xl z-20">
        <div className="p-6 border-b border-teal-800">
          <Link href="/provider" className="inline-block mb-2 bg-white p-1.5 rounded-lg shadow-sm">
            <Image
              src="/logo-horizontal.jpg"
              alt="NauriCare Logo"
              width={150}
              height={40}
              className="h-8 w-auto rounded-sm"
              priority
            />
          </Link>
          <p className="text-teal-400 text-xs font-semibold tracking-wider uppercase mt-1">Clinical Portal</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-teal-800 text-white shadow-sm"
                    : "text-teal-100 hover:bg-teal-800/50 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-teal-800">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-teal-100 hover:bg-teal-800 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-8 shadow-sm z-10">
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

        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
