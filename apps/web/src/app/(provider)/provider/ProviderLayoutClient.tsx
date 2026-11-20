"use client";

import { Activity, Calendar, MessageSquare, MessageSquarePlus, Pill, Users } from "lucide-react";
import type { NavItem } from "@/components/navigation/AppSidebar";
import { StaffShell } from "@/components/navigation/StaffShell";

const navItems: NavItem[] = [
  { name: "Clinical dashboard", href: "/provider", icon: Activity },
  { name: "Patient roster", href: "/provider/roster", icon: Users },
  { name: "Appointments", href: "/provider/schedule", icon: Calendar },
  { name: "Prescriptions", href: "/provider/prescriptions", icon: Pill },
  { name: "Messages", href: "/provider/messages", icon: MessageSquare },
  { name: "Feedback", href: "/provider/feedback", icon: MessageSquarePlus },
];

export default function ProviderLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <StaffShell items={navItems} home="/provider" label="Clinical Portal">
      {children}
    </StaffShell>
  );
}
