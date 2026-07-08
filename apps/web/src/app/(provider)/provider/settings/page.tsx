import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Settings } from "lucide-react";
import ProviderSettingsClient from "./ProviderSettingsClient";

export const dynamic = "force-dynamic";

export default async function ProviderSettingsPage() {
  await cookies();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "PROVIDER") redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      licenseNumber: true,
      hospitalAffiliation: true,
      secondaryEmail: true,
      practitionerProfile: {
        select: { specialty: true, bio: true, clinicName: true },
      },
      availability: {
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        take: 50,
      },
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Settings className="w-8 h-8 text-blue-600" />
          Settings &amp; Preferences
        </h1>
        <p className="text-slate-500 mt-1">Manage your professional profile and account security.</p>
      </div>

      <ProviderSettingsClient
        profile={{
          name: user.name,
          email: user.email,
          specialty: user.practitionerProfile?.specialty ?? "",
          bio: user.practitionerProfile?.bio ?? "",
          clinicName: user.practitionerProfile?.clinicName ?? "",
          licenseNumber: user.licenseNumber ?? "",
          hospitalAffiliation: user.hospitalAffiliation ?? "",
          secondaryEmail: user.secondaryEmail ?? "",
        }}
        availabilitySlots={user.availability.map((s) => ({
          id: s.id,
          date: s.date.toISOString().split("T")[0],
          startTime: s.startTime,
          endTime: s.endTime,
          isAvailable: s.isAvailable,
        }))}
      />
    </div>
  );
}
