"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import {
  Activity, Users, Calendar, MessageSquare, LogOut,
  Bell, Settings, User, Lock, Sliders, CheckCircle, Pill
} from "lucide-react";

const navItems = [
  { name: "Clinical Dashboard", href: "/provider",               icon: Activity },
  { name: "Patient Roster",     href: "/provider/roster",        icon: Users },
  { name: "Appointments",       href: "/provider/schedule",      icon: Calendar },
  { name: "Prescriptions",      href: "/provider/prescriptions", icon: Pill },
  { name: "Messages",           href: "/provider/messages",      icon: MessageSquare },
];

export default function ProviderLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

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
                    <h3 className="font-semibold text-gray-900">Clinical Alerts</h3>
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
                        <p className="text-sm font-medium text-gray-900">Profile Verified</p>
                        <p className="text-xs text-gray-500 mt-0.5">Your medical credentials have been successfully validated by NauriCare.</p>
                        <p className="text-[10px] text-gray-400 mt-1.5 font-medium uppercase tracking-wider">Just now</p>
                      </div>
                    </div>
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
