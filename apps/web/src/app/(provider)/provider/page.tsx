import { Users, Calendar, Clock, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth-guards";

export default async function ProviderDashboardPage() {
  const session = await requireRole("PROVIDER");

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-ink">Clinical Dashboard</h1>
        <p className="text-ink-muted mt-1">
          Welcome to your portal,{" "}
          <span className="font-semibold text-brand-ink">Dr. {session?.user?.name || "Provider"}</span>.
        </p>
      </div>

      {/* Clinical KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-ink-muted">Today&apos;s Appointments</CardTitle>
            <Calendar className="w-4 h-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-ink">0</div>
            <p className="text-xs text-info mt-1">Scheduled for today</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-ink-muted">Active Patients</CardTitle>
            <Users className="w-4 h-4 text-brand-ink" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-ink">0</div>
            <p className="text-xs text-brand-ink mt-1">Assigned to your roster</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-ink-muted">Pending Reviews</CardTitle>
            <Clock className="w-4 h-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-ink">0</div>
            <p className="text-xs text-warning mt-1">Symptom logs awaiting review</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-ink-muted">Profile Status</CardTitle>
            <Activity className="w-4 h-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-ink mt-1">Verified</div>
            <p className="text-xs text-success mt-1.5">Practitioner credentials active</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Workspace Area */}
      <div className="bg-surface border border-hairline rounded-xl shadow-sm p-8 text-center mt-8">
        <div className="mx-auto w-16 h-16 bg-info-soft rounded-full flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-info" />
        </div>
        <h3 className="text-xl font-bold text-ink">No Upcoming Consultations</h3>
        <p className="text-ink-muted mt-2 max-w-md mx-auto">
          Your schedule is currently clear. When patients book virtual or in-person appointments with you, they will
          appear right here.
        </p>
      </div>
    </div>
  );
}
