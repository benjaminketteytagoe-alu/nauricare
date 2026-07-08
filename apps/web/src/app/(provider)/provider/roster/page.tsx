import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Users, Search, Calendar, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { AppointmentStatusButton } from "./AppointmentStatusButton";

export const dynamic = "force-dynamic";

export default async function ProviderRosterPage() {
  await cookies();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "PROVIDER") redirect("/login");

  const practitioner = await prisma.practitionerProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!practitioner) {
    return (
      <div className="p-8 text-center text-gray-500">
        Practitioner profile not found. Please contact an administrator.
      </div>
    );
  }

  const patients = await prisma.patientProfile.findMany({
    where: { appointments: { some: { practitionerProfileId: practitioner.id } } },
    include: {
      user: { select: { name: true, email: true, phoneNumber: true } },
      appointments: {
        where: { practitionerProfileId: practitioner.id },
        orderBy: { startTime: "desc" },
        take: 1,
      },
    },
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Patient Roster
          </h1>
          <p className="text-slate-500 mt-1">Manage and review your active patients.</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search patients…"
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 bg-white"
          />
        </div>
      </div>

      {patients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No Patients Yet</h3>
          <p className="text-slate-500 mt-1">
            Patients will appear here once they book a consultation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map((patient) => {
            const lastAppt = patient.appointments[0];
            const status = (lastAppt?.status ?? "SCHEDULED") as
              | "SCHEDULED"
              | "COMPLETED"
              | "CANCELLED"
              | "MISSED";

            const statusColors: Record<string, string> = {
              SCHEDULED: "text-blue-600",
              COMPLETED: "text-emerald-600",
              CANCELLED: "text-slate-500",
              MISSED:    "text-rose-600",
            };

            return (
              <div
                key={patient.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
              >
                {/* Card header */}
                <div className="p-6 border-b border-slate-50">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center font-bold text-xl">
                      {patient.user.name.charAt(0)}
                    </div>
                    {patient.healthGoals.length > 0 && (
                      <span className="bg-rose-50 text-rose-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> Targeted
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{patient.user.name}</h3>
                  <p className="text-sm text-slate-500">{patient.user.email}</p>
                </div>

                {/* Appointment info */}
                <div className="p-4 bg-slate-50 flex-1 space-y-3">
                  {lastAppt ? (
                    <>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>
                          {new Date(lastAppt.startTime).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {" · "}
                          {new Date(lastAppt.startTime).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className={`text-xs font-semibold mt-0.5 ${statusColors[status]}`}>
                          ● {status}
                        </span>
                      </div>
                      {/* Status update buttons — only shown for SCHEDULED appointments */}
                      <AppointmentStatusButton
                        appointmentId={lastAppt.id}
                        currentStatus={status}
                      />
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">No appointments recorded.</p>
                  )}
                </div>

                {/* Card footer */}
                <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
                  <Link href={`/provider/roster/${patient.id}`} className="flex-1">
                    <button className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-2 rounded-xl text-sm transition-colors">
                      View Records
                    </button>
                  </Link>
                  {lastAppt?.meetingLink && (
                    <Link href={lastAppt.meetingLink} className="flex-1">
                      <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-xl text-sm transition-colors">
                        Join Room
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
