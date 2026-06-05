import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { Users, ExternalLink, Calendar, MapPin, Search } from "lucide-react";
import Link from "next/link";

export default async function ProviderRosterPage() {
  const session = await getServerSession(authOptions);

  // 1. Get the current provider's practitioner ID
  const provider = await prisma.user.findUnique({
    where: { id: session?.user?.id },
    include: { practitionerProfile: true },
  });

  const practitionerId = provider?.practitionerProfile?.id;

  // 2. Fetch all unique patients who have booked an appointment with this provider
  let patients: any[] = [];
  
  if (practitionerId) {
    patients = await prisma.user.findMany({
      where: {
        role: "PATIENT",
        patientAppointments: {
          some: {
            practitionerId: practitionerId,
          },
        },
      },
      include: {
        patientProfile: true,
        // Grab their most recent appointment with this specific provider to display on the roster
        patientAppointments: {
          where: { practitionerId: practitionerId },
          orderBy: { date: "desc" },
          take: 1,
        },
      },
    });
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Patient Roster</h1>
          <p className="text-slate-500 mt-1">View and manage patients assigned to your care.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search patients by name or ID (Client-side filtering pending)..." 
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-medium">Patient Details</th>
                <th className="px-6 py-4 font-medium">Location</th>
                <th className="px-6 py-4 font-medium">Latest Appointment</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-500">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-900">No Patients Yet</h3>
                    <p className="text-sm mt-1 max-w-sm mx-auto">
                      Your roster is currently empty. Patients will appear here automatically once they book a consultation with you.
                    </p>
                  </td>
                </tr>
              ) : (
                patients.map(patient => {
                  const latestAppt = patient.patientAppointments[0];
                  
                  return (
                    <tr key={patient.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{patient.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{patient.email}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-1">ID: {patient.id.slice(0, 8)}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {patient.patientProfile?.country ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {patient.patientProfile.country}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {latestAppt ? (
                          <div>
                            <div className="flex items-center gap-1.5 font-medium text-slate-700">
                              <Calendar className="w-3.5 h-3.5 text-blue-500" />
                              {new Date(latestAppt.date).toLocaleDateString()}
                            </div>
                            <div className="text-xs mt-1">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                                latestAppt.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" :
                                latestAppt.status === "SCHEDULED" ? "bg-blue-50 text-blue-700" :
                                "bg-slate-100 text-slate-600"
                              }`}>
                                {latestAppt.status}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No history</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/provider/roster/${patient.id}`}>
                          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100">
                            View Profile
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
