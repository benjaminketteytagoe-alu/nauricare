import { Users, Search, Calendar, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { AppointmentStatusButton } from "./AppointmentStatusButton";

export const dynamic = "force-dynamic";

export default async function ProviderRosterPage() {
  const session = await requireRole("PROVIDER");

  const practitioner = await prisma.practitionerProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!practitioner) {
    return (
      <div className="p-8 text-center text-ink-muted">
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
          <h1 className="text-3xl font-bold text-ink flex items-center gap-3">
            <Users className="w-8 h-8 text-info" />
            Patient Roster
          </h1>
          <p className="text-ink-muted mt-1">Manage and review your active patients.</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search patients…"
            className="pl-9 pr-4 py-2 border border-hairline rounded-xl text-sm focus:ring-2 focus:ring-focus outline-none w-64 bg-surface"
          />
        </div>
      </div>

      {patients.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-hairline p-12 text-center shadow-sm">
          <Users className="w-12 h-12 text-field mx-auto mb-4" />
          <h3 className="text-lg font-bold text-ink">No Patients Yet</h3>
          <p className="text-ink-muted mt-1">Patients will appear here once they book a consultation.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map((patient) => {
            const lastAppt = patient.appointments[0];
            const status = (lastAppt?.status ?? "SCHEDULED") as "SCHEDULED" | "COMPLETED" | "CANCELLED" | "MISSED";

            const statusColors: Record<string, string> = {
              SCHEDULED: "text-info",
              COMPLETED: "text-success",
              CANCELLED: "text-ink-muted",
              MISSED: "text-brand-ink",
            };

            return (
              <div
                key={patient.id}
                className="bg-surface rounded-2xl border border-hairline shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
              >
                {/* Card header */}
                <div className="p-6 border-b border-hairline">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-info-soft text-info rounded-full flex items-center justify-center font-bold text-xl">
                      {patient.user.name.charAt(0)}
                    </div>
                    {patient.healthGoals.length > 0 && (
                      <span className="bg-brand-soft text-brand-ink text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> Targeted
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-ink">{patient.user.name}</h3>
                  <p className="text-sm text-ink-muted">{patient.user.email}</p>
                </div>

                {/* Appointment info */}
                <div className="p-4 bg-surface-muted flex-1 space-y-3">
                  {lastAppt ? (
                    <>
                      <div className="flex items-center gap-2 text-sm text-ink-soft">
                        <Calendar className="w-4 h-4 text-ink-muted" />
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
                        <span className={`text-xs font-semibold mt-0.5 ${statusColors[status]}`}>● {status}</span>
                      </div>
                      {/* Status update buttons — only shown for SCHEDULED appointments */}
                      <AppointmentStatusButton appointmentId={lastAppt.id} currentStatus={status} />
                    </>
                  ) : (
                    <p className="text-sm text-ink-muted">No appointments recorded.</p>
                  )}
                </div>

                {/* Card footer */}
                <div className="p-4 bg-surface border-t border-hairline flex gap-2">
                  <Link href={`/provider/roster/${patient.id}`} className="flex-1">
                    <button className="w-full bg-surface border border-hairline hover:bg-surface-muted text-ink-soft font-medium py-2 rounded-xl text-sm transition-colors">
                      View Records
                    </button>
                  </Link>
                  {lastAppt?.meetingLink && (
                    <Link href={lastAppt.meetingLink} className="flex-1">
                      <button className="w-full bg-info hover:bg-info text-white font-medium py-2 rounded-xl text-sm transition-colors">
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
