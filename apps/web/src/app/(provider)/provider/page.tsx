import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Clock, Activity } from "lucide-react";

export default async function ProviderDashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Clinical Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Welcome to your portal, <span className="font-semibold text-blue-700">Dr. {session?.user?.name || "Provider"}</span>.
        </p>
      </div>

      {/* Clinical KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Today&apos;s Appointments</CardTitle>
            <Calendar className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">0</div>
            <p className="text-xs text-blue-600 mt-1">Scheduled for today</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Active Patients</CardTitle>
            <Users className="w-4 h-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">0</div>
            <p className="text-xs text-teal-600 mt-1">Assigned to your roster</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Pending Reviews</CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">0</div>
            <p className="text-xs text-amber-600 mt-1">Symptom logs awaiting review</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Profile Status</CardTitle>
            <Activity className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-slate-900 mt-1">Verified</div>
            <p className="text-xs text-emerald-600 mt-1.5">Practitioner credentials active</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Workspace Area */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-8 text-center mt-8">
        <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">No Upcoming Consultations</h3>
        <p className="text-slate-500 mt-2 max-w-md mx-auto">
          Your schedule is currently clear. When patients book virtual or in-person appointments with you, they will appear right here.
        </p>
      </div>
    </div>
  );
}
