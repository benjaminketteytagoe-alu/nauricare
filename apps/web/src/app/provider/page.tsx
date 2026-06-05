import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Clock, AlertCircle } from "lucide-react";

export default async function ProviderOverviewPage() {
  const session = await getServerSession(authOptions);

  // In a real scenario, we would filter these by the provider's ID.
  // For now, we'll fetch general stats to ensure the UI wires up correctly.
  const [totalPatients, upcomingAppointments] = await Promise.all([
    prisma.user.count({ where: { role: "PATIENT" } }),
    prisma.appointment.count({ where: { status: "SCHEDULED" } }),
  ]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Clinical Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Welcome back, Dr. <span className="font-semibold text-blue-700">{session?.user?.name || "Provider"}</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">My Patients</CardTitle>
            <Users className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{totalPatients}</div>
            <p className="text-xs text-slate-500 mt-1">Active in your roster</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Today's Consults</CardTitle>
            <Calendar className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">0</div>
            <p className="text-xs text-slate-500 mt-1">Scheduled for today</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Upcoming</CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{upcomingAppointments}</div>
            <p className="text-xs text-slate-500 mt-1">Future bookings</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Health Alerts</CardTitle>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">0</div>
            <p className="text-xs text-slate-500 mt-1">Symptom escalations</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-6 flex flex-col items-center justify-center min-h-[300px]">
           <Calendar className="w-12 h-12 text-slate-200 mb-4" />
           <h3 className="text-lg font-medium text-slate-900">Schedule Empty</h3>
           <p className="text-sm text-slate-500 mt-1 text-center max-w-sm">
             Your upcoming appointments will appear here once patients book consultations.
           </p>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-6 flex flex-col items-center justify-center min-h-[300px]">
           <AlertCircle className="w-12 h-12 text-slate-200 mb-4" />
           <h3 className="text-lg font-medium text-slate-900">No Patient Alerts</h3>
           <p className="text-sm text-slate-500 mt-1 text-center max-w-sm">
             Automated alerts for high-risk symptom logs (PCOS/Fibroids) will be flagged here for review.
           </p>
        </div>
      </div>
    </div>
  );
}
