"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import {
  LayoutDashboard, Activity, Calendar, FileText, Settings, LogOut,
  Users, Menu, X, Pill, MessageSquare,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";

const navItems = [
  { name: "My Health",       href: "/dashboard",                icon: LayoutDashboard },
  { name: "Symptom Log",     href: "/dashboard/symptoms",       icon: Activity },
  { name: "Consultations",   href: "/dashboard/providers",      icon: Calendar },
  { name: "My Records",      href: "/dashboard/records",        icon: FileText },
  { name: "Prescriptions",   href: "/dashboard/prescriptions",  icon: Pill },
  { name: "Messages",        href: "/dashboard/messages",       icon: MessageSquare },
  { name: "Community",       href: "/dashboard/community",      icon: Users },
  { name: "Settings",        href: "/dashboard/settings",       icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const close = () => setIsSidebarOpen(false);

  return (
    <>
      {/* ── Mobile-only top bar ───────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex md:hidden items-center justify-between px-4 z-30 shrink-0">
        <Link href="/dashboard" onClick={close} className="hover:opacity-80 transition-opacity">
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
          <button
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open navigation menu"
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-teal-600 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* ── Backdrop overlay (mobile only) ───────────────────────── */}
      {isSidebarOpen && (
        <div
          aria-hidden="true"
          onClick={close}
          className="fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden"
        />
      )}

      {/* ── Off-canvas sidebar panel ─────────────────────────────── */}
      <aside
        className={[
          // Base — mobile: fixed off-canvas panel
          "fixed inset-y-0 left-0 z-50 w-64",
          "bg-white border-r border-slate-200",
          "flex flex-col",
          "shadow-xl",
          "transform transition-transform duration-300 ease-in-out",
          // Mobile open/close state
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop — back in normal flow, always visible
          "md:relative md:inset-auto md:translate-x-0 md:shadow-none",
          "md:h-screen md:sticky md:top-0 md:shrink-0",
        ].join(" ")}
      >
        {/* Sidebar header */}
        <div className="h-16 md:h-24 px-5 border-b border-slate-100 flex items-center justify-between md:flex-col md:items-start md:justify-center">
          <Link
            href="/dashboard"
            onClick={close}
            className="hover:opacity-80 transition-opacity"
          >
            <Image
              src="/logo-horizontal.jpg"
              alt="NauriCare Logo"
              width={180}
              height={45}
              className="h-9 w-auto object-contain"
              priority
            />
          </Link>

          {/* "Patient Portal" label — desktop only */}
          <span className="hidden md:block text-[10px] font-extrabold text-teal-600 tracking-[0.2em] uppercase mt-2 ml-1">
            Patient Portal
          </span>

          {/* Close button — mobile only */}
          <button
            onClick={close}
            aria-label="Close navigation menu"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 p-4 space-y-1.5 mt-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (pathname?.startsWith(`${item.href}/`) && item.href !== "/dashboard");
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={close}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-teal-50 text-teal-700 shadow-sm border border-teal-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-teal-600 border border-transparent"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-teal-600" : "text-slate-400"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 space-y-1">
          <div className="hidden md:flex items-center gap-3 px-4 py-3 text-slate-600">
            <NotificationBell />
            <span className="text-sm font-medium">Notifications</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
