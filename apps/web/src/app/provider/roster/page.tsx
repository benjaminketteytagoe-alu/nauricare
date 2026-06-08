import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Users, Search, Clock, Calendar, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default async function ProviderRosterPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "PROVIDER") {
    redirect("/login");
  }

  // 1. Get the Practitioner Profile
  const practitioner = await prisma.practitionerProfile.findUnique({
    where: { userId: session.user.id }
  });

  if (!practitioner) {
    return (
      <div className="p-8 text-center text-gray-500">
        Practitioner profile not found. Please contact an administrator.
      </div>
    );
  }

  // 2. Safely fetch all patients who have an appointment with THIS doctor
  const patients = await prisma.patientProfile.findMany({
    where: {
      appointments: {
        some: { practitionerProfileId: practitioner.id }
      }
    },
    include: {
      user: {
        select: { name: true, email: true, phoneNumber: true }
      },
      // Bring in their most recent appointment for context
      appointments: {
        where: { practitionerProfileId: practitioner.id },
        orderBy: { startTime: 'desc' },
        take: 1
      }
    }
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Patient Roster
          </h1>
          <p className="text-slate-500 mt-1">Manage and review your active patients.</p>
        </div>
        
        {/* Search Bar Stub */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search patients..." 
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 bg-white"
          />
        </div>
      </div>

      {/* Roster Grid */}
      {patients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Patients Yet</h3>
          <p className="text-slate-500 mt-1">Patients will appear here once they book a consultation.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map((patient) => {
            const lastAppt = patient.appointments[0];
            return (
              <div key={patient.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
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
                
                <div className="p-4 bg-slate-50 flex-1 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Last Visit: {lastAppt ? new Date(lastAppt.startTime).toLocaleDateString() : "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Status: {lastAppt?.status || "PENDING"}</span>
                  </div>
                </div>

                <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
                  {/* FIX: Correctly wrapped the Link tag around the button */}
                  <Link href={`/provider/roster/${patient.id}`} className="flex-1">
                    <button className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-2 rounded-xl text-sm transition-colors">
                      View Records
                    </button>
                  </Link>

                  <Link href={`/dashboard/telehealth/${lastAppt?.id}`} className="flex-1">
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-xl text-sm transition-colors">
                      Join Room
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
