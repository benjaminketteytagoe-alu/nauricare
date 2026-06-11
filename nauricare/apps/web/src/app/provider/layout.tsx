"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Users, Activity, LogOut } from "lucide-react";

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Clinical Dashboard", href: "/provider", icon: Activity },
    { name: "Patient Roster", href: "/provider/roster", icon: Users },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-20 shrink-0">
        
        {/* BRAND LOGO HEADER */}
        <div className="h-24 px-6 border-b border-slate-100 flex flex-col justify-center">
          <Link href="/provider" className="block hover:opacity-80 transition-opacity">
            <Image 
              src="/logo-horizontal.jpg" 
              alt="NauriCare Logo" 
              width={180} 
              height={45} 
              className="h-9 w-auto object-contain"
              priority
            />
          </Link>
          <span className="text-[10px] font-extrabold text-blue-600 tracking-[0.2em] uppercase mt-2 ml-1">
            Clinical Portal
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                  isActive 
                    ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-blue-600 border border-transparent"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <LogOut className="w-5 h-5 text-slate-400" />
            Secure Sign Out
          </button>
        </div>
      </aside>

      {/* Main Clinical Canvas */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
