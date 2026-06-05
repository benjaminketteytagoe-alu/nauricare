"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { 
  LayoutDashboard, ActivitySquare, BookOpen, 
  PlayCircle, Users, Settings, LogOut, Stethoscope 
} from "lucide-react";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: "My Health", href: "/dashboard", icon: LayoutDashboard },
    { name: "Specialists", href: "/dashboard/providers", icon: Stethoscope },
    { name: "AI Symptom Checker", href: "/dashboard/symptoms", icon: ActivitySquare },
    { name: "Articles", href: "/dashboard/articles", icon: BookOpen },
    { name: "Videos", href: "/dashboard/videos", icon: PlayCircle },
    { name: "Community", href: "/dashboard/community", icon: Users },
  ];

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm z-20">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <Link href="/dashboard" className="block">
            <Image 
              src="/logo-horizontal.jpg" 
              alt="NauriCare Logo" 
              width={140} 
              height={36} 
              className="h-7 w-auto" 
            />
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <p className="px-4 text-[11px] font-bold tracking-wider text-gray-400 uppercase mb-3 mt-2">Menu</p>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname?.startsWith(`${item.href}/`) && item.href !== "/dashboard");
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive 
                    ? "bg-teal-50 text-teal-700 shadow-sm border border-teal-100" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-teal-600 border border-transparent"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-teal-600" : "text-gray-400"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-1.5">
          <Link
            href="/dashboard/settings"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              pathname?.startsWith("/dashboard/settings")
                ? "bg-teal-50 text-teal-700 shadow-sm border border-teal-100" 
                : "text-gray-600 hover:bg-gray-50 hover:text-teal-600 border border-transparent"
            }`}
          >
            <Settings className="w-5 h-5 text-gray-400" />
            Settings
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <LogOut className="w-5 h-5 text-gray-400" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Canvas */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* We can add a top bar here later for the Avatar/Profile dropdown if desired */}
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
