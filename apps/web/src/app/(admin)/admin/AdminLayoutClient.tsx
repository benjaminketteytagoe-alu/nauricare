"use client";

import { LayoutDashboard, MessageSquareHeart, SearchCheck, ShieldAlert, Stethoscope, Store } from "lucide-react";
import type { NavItem } from "@/components/navigation/AppSidebar";
import { StaffShell } from "@/components/navigation/StaffShell";

const navItems: NavItem[] = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Providers", href: "/admin/providers", icon: Stethoscope },
  { name: "Provider sourcing", href: "/admin/sourcing", icon: SearchCheck },
  { name: "Pharmacies", href: "/admin/pharmacies", icon: Store },
  { name: "Feedback", href: "/admin/feedback", icon: MessageSquareHeart },
  { name: "Audit log", href: "/admin/audit", icon: ShieldAlert },
];

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <StaffShell items={navItems} home="/admin" label="Admin Console">
      {children}
    </StaffShell>
  );
}
