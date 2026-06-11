import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Calendar, Search, Clock, Video, MapPin, CheckCircle, ChevronRight } from "lucide-react";
import Link from "next/link";

export default async function ProviderSchedulePage() {
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
        Practitioner profile not found.
      </div>
    );
  }

  // 2. Fetch upcoming appointments
  const appointments = await prisma.appointment.findMany({
    where: { 
      practitionerProfileId: practitioner.id,
      // Filter for upcoming dates if desired, e.g., startTime: { gte: new Date() }
    },
    include: {
      patientProfile: {
        include: {
          user: { select: { name: true, email: true } }
        }
      }
    },
    orderBy: { startTime: 'asc' },
    take: 10
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            Appointments
          </h1>
          <p className="text-slate-500 mt-1">Manage your daily schedule and upcoming consultations.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search appointments..." 
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Schedule Feed */}
      {appointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Appointments Scheduled</h3>
          <p className="text-slate-500 mt-1">Your calendar is clear. New bookings will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => (
            <div key={appt.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm hover:shadow-md transition-shadow">
              
              <div className="flex items-center gap-5">
                <div className="hidden sm:flex flex-col items-center justify-center w-16 h-16 bg-blue-50 rounded-xl border border-blue-100">
                  <span className="text-xs font-bold text-blue-600 uppercase">
                    {new Date(appt.startTime).toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                  <span className="text-xl font-black text-blue-900">
                    {new Date(appt.startTime).getDate()}
                  </span>
                </div>
                
                <div>
                  <h4 className="text-lg font-bold text-slate-900">
                    {appt.patientProfile?.user?.name || "Unknown Patient"}
                  </h4>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-600">
                    <span className="flex items-center gap-1.5 font-medium text-slate-800">
                      <Clock className="w-4 h-4 text-blue-500" /> 
                      {new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {appt.type === "VIRTUAL" ? <Video className="w-4 h-4 text-slate-400" /> : <MapPin className="w-4 h-4 text-slate-400" />}
                      {appt.type || "Virtual Consultation"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      {appt.status || "CONFIRMED"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link href={`/provider/roster/${appt.patientProfileId}`} className="flex-1 sm:flex-none">
                  <button className="w-full px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                    Patient File
                  </button>
                </Link>
                <Link href={`/dashboard/telehealth/${appt.id}`} className="flex-1 sm:flex-none">
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                    <Video className="w-4 h-4" /> Join Room
                  </button>
                </Link>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
