import { Users, Stethoscope, Store, Activity, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const session = await requireRole("ADMIN");

  // 1. Fetch live metrics
  const [totalPatients, activeProviders, partnerPharmacies] = await Promise.all([
    prisma.user.count({ where: { role: "PATIENT" } }),
    prisma.user.count({ where: { role: "PROVIDER" } }),
    prisma.pharmacy.count(),
  ]);

  const yesterday = new Date();
  yesterday.setHours(yesterday.getHours() - 24);
  const recentEvents = await prisma.auditLog.count({
    where: { createdAt: { gte: yesterday } },
  });

  // 2. Analytics Aggregation: Group audit events to see where engagement is happening
  const eventStats = await prisma.auditLog.groupBy({
    by: ["action"],
    _count: {
      action: true,
    },
    orderBy: {
      _count: { action: "desc" },
    },
    take: 5, // Top 5 actions
  });

  // Calculate total for percentage rendering
  const totalTrackedActions = eventStats.reduce((sum, stat) => sum + stat._count.action, 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-ink">System Overview</h1>
        <p className="text-ink-muted mt-1">
          Welcome back, <span className="font-semibold text-brand-ink">{session?.user?.name || "Administrator"}</span>.
          Here is what is happening across NauriCare today.
        </p>
      </div>

      {/* Live Analytics KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-ink-muted">Total Patients</CardTitle>
            <Users className="w-4 h-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-ink">{totalPatients}</div>
            <p className="text-xs text-info mt-1">Registered users</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-ink-muted">Active Providers</CardTitle>
            <Stethoscope className="w-4 h-4 text-brand-ink" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-ink">{activeProviders}</div>
            <p className="text-xs text-brand-ink mt-1">Onboarded practitioners</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-ink-muted">Partner Pharmacies</CardTitle>
            <Store className="w-4 h-4 text-lavender" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-ink">{partnerPharmacies}</div>
            <p className="text-xs text-lavender mt-1">Network locations</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-ink-muted">System Events</CardTitle>
            <Activity className="w-4 h-4 text-brand-ink" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-ink">{recentEvents}</div>
            <p className="text-xs text-brand-ink mt-1">Recorded in the last 24h</p>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Analytics Chart */}
      <div className="bg-surface border border-hairline rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-brand-soft p-2 rounded-lg">
            <BarChart3 className="w-5 h-5 text-brand-ink" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ink">Engagement Analytics</h3>
            <p className="text-sm text-ink-muted">Distribution of platform actions over all time.</p>
          </div>
        </div>

        {eventStats.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-ink-muted">
            <Activity className="w-8 h-8 mb-2 opacity-50" />
            <p>Not enough data to generate chart.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {eventStats.map((stat, index) => {
              const percentage = Math.round((stat._count.action / totalTrackedActions) * 100);

              // Dynamic coloring based on index
              const colors = ["bg-brand", "bg-info", "bg-lavender", "bg-brand", "bg-warning"];

              return (
                <div key={stat.action} className="relative">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-ink-soft capitalize">
                      {stat.action.replace(/_/g, " ").toLowerCase()}
                    </span>
                    <span className="text-ink-muted font-mono text-xs">
                      {percentage}% ({stat._count.action})
                    </span>
                  </div>
                  <div className="w-full bg-surface-muted rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full ${colors[index % colors.length]} transition-all duration-1000 ease-out`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
