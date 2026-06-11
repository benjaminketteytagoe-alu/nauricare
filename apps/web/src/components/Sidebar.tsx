"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { 
  LayoutDashboard, Activity, Calendar, FileText, Settings, LogOut 
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "My Health", href: "/dashboard", icon: LayoutDashboard },
    { name: "Symptom Log", href: "/dashboard/symptoms", icon: Activity },
    { name: "Consultations", href: "/dashboard/providers", icon: Calendar },
    { name: "My Records", href: "/dashboard/records", icon: FileText },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-20 shrink-0 h-screen sticky top-0">
      {/* BRAND LOGO HEADER */}
      <div className="h-24 px-6 border-b border-slate-100 flex flex-col justify-center">
        <Link href="/dashboard" className="block hover:opacity-80 transition-opacity">
          <Image 
            src="/logo-horizontal.jpg" 
            alt="NauriCare Logo" 
            width={180} 
            height={45} 
            className="h-9 w-auto object-contain"
            priority
          />
        </Link>
        <span className="text-[10px] font-extrabold text-teal-600 tracking-[0.2em] uppercase mt-2 ml-1">
          Patient Portal
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5 mt-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (pathname?.startsWith(`${item.href}/`) && item.href !== "/dashboard");
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
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
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
