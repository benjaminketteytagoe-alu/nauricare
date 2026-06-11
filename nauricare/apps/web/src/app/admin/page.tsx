import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Stethoscope, Store, Activity, BarChart3 } from "lucide-react";

export default async function AdminOverviewPage() {
  const session = await getServerSession(authOptions);

  // 1. Fetch live metrics
  const [totalPatients, activeProviders, partnerPharmacies] = await Promise.all([
    prisma.user.count({ where: { role: "PATIENT" } }),
    prisma.user.count({ where: { role: "PROVIDER" } }),
    prisma.pharmacy.count(),
  ]);

  const yesterday = new Date();
  yesterday.setHours(yesterday.getHours() - 24);
  const recentEvents = await prisma.auditEvent.count({
    where: { createdAt: { gte: yesterday } },
  });

  // 2. Analytics Aggregation: Group audit events to see where engagement is happening
  const eventStats = await prisma.auditEvent.groupBy({
    by: ['action'],
    _count: {
      action: true,
    },
    orderBy: {
      _count: { action: 'desc' }
    },
    take: 5 // Top 5 actions
  });

  // Calculate total for percentage rendering
  const totalTrackedActions = eventStats.reduce((sum, stat) => sum + stat._count.action, 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Overview</h1>
        <p className="text-gray-500 mt-1">
          Welcome back, <span className="font-semibold text-teal-700">{session?.user?.name || "Administrator"}</span>. Here is what is happening across NauriCare today.
        </p>
      </div>

      {/* Live Analytics KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Patients</CardTitle>
            <Users className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{totalPatients}</div>
            <p className="text-xs text-blue-600 mt-1">Registered users</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Providers</CardTitle>
            <Stethoscope className="w-4 h-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{activeProviders}</div>
            <p className="text-xs text-teal-600 mt-1">Onboarded practitioners</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Partner Pharmacies</CardTitle>
            <Store className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{partnerPharmacies}</div>
            <p className="text-xs text-purple-600 mt-1">Network locations</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">System Events</CardTitle>
            <Activity className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{recentEvents}</div>
            <p className="text-xs text-rose-600 mt-1">Recorded in the last 24h</p>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Analytics Chart */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-teal-50 p-2 rounded-lg">
            <BarChart3 className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Engagement Analytics</h3>
            <p className="text-sm text-gray-500">Distribution of platform actions over all time.</p>
          </div>
        </div>

        {eventStats.length === 0 ? (
           <div className="h-48 flex flex-col items-center justify-center text-gray-400">
             <Activity className="w-8 h-8 mb-2 opacity-50" />
             <p>Not enough data to generate chart.</p>
           </div>
        ) : (
          <div className="space-y-5">
            {eventStats.map((stat, index) => {
              const percentage = Math.round((stat._count.action / totalTrackedActions) * 100);
              
              // Dynamic coloring based on index
              const colors = [
                "bg-teal-500", 
                "bg-blue-500", 
                "bg-purple-500", 
                "bg-rose-500", 
                "bg-amber-500"
              ];
              
              return (
                <div key={stat.action} className="relative">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-gray-700 capitalize">
                      {stat.action.replace(/_/g, ' ').toLowerCase()}
                    </span>
                    <span className="text-gray-500 font-mono text-xs">{percentage}% ({stat._count.action})</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-2.5 rounded-full ${colors[index % colors.length]} transition-all duration-1000 ease-out`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
}
