"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Calendar, Clock, Video, User, Activity, Stethoscope, CheckCircle2 } from "lucide-react";

export default function ProviderDashboardPage() {
  const { data: session } = useSession();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/appointments")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAppointments(data);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-teal-900 flex items-center gap-3">
            <Stethoscope className="w-8 h-8 text-teal-600" />
            Clinical Command Center
          </h1>
          <p className="text-gray-500 mt-1">Welcome back, Dr. <span className="font-semibold text-teal-700">{session?.user?.name}</span>.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: The Schedule */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600" />
                Upcoming Appointments
              </h2>
              <span className="bg-teal-100 text-teal-800 text-xs font-bold px-3 py-1 rounded-full">
                {appointments.length} Sessions
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {isLoading ? (
                <div className="p-8 text-center text-gray-500">Loading schedule...</div>
              ) : appointments.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">No appointments scheduled</h3>
                  <p className="text-gray-500">Your schedule is currently clear.</p>
                </div>
              ) : (
                appointments.map((apt) => {
                  const startTime = new Date(apt.startTime);
                  return (
                    <div key={apt.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-teal-50 text-teal-700 rounded-full flex items-center justify-center font-bold text-xl shrink-0">
                          {apt.patient?.user?.name?.charAt(0) || "P"}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{apt.patient?.user?.name || "Unknown Patient"}</h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                          {apt.notes && (
                            <p className="text-sm text-gray-600 mt-2 bg-white border border-gray-100 p-2.5 rounded-lg">
                              <span className="font-semibold text-gray-900">Notes: </span>{apt.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Video Link generated exactly the same way as the Patient's side */}
                      <Link href={`/dashboard/telehealth/${apt.id}`} className="shrink-0">
                        <button className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-sm flex items-center justify-center gap-2 transition-all">
                          <Video className="w-4 h-4" /> Join Room
                        </button>
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Quick Stats */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-md">
            <h3 className="text-lg font-bold mb-4">Doctor Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                <span className="text-slate-300 text-sm">Status</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" /> Verified Provider
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                <span className="text-slate-300 text-sm">Appointments This Week</span>
                <span className="text-white font-bold">{appointments.length}</span>
              </div>
              <div className="flex justify-between items-center pb-1">
                <span className="text-slate-300 text-sm">Total Patients Consulted</span>
                <span className="text-white font-bold">--</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
