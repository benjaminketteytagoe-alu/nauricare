import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import { PatientShell } from "@/components/Sidebar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("PATIENT");

  // Patients must finish their health onboarding profile first.
  const profile = await prisma.patientProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  if (!profile) redirect("/onboarding");

  return <PatientShell>{children}</PatientShell>;
}
