import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, TrendingUp, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

const LOOKBACK_DAYS = 30;

// Aggregate-only wellness categories shown to HR. Every count here is a
// total across the whole org's employees — never per-person — so this page
// can never reveal who used what, only how much a category was used.
async function getOrgWellnessSnapshot(organizationId: string) {
  const employees = await prisma.user.findMany({
    where: { organizationId, isCorporateEmployee: true },
    select: { id: true },
  });
  const employeeIds = employees.map((e) => e.id);

  if (employeeIds.length === 0) {
    return {
      engagementRate: 0,
      activeEmployees: 0,
      totalEmployees: 0,
      categories: [] as { name: string; count: number }[],
    };
  }

  const patientProfiles = await prisma.patientProfile.findMany({
    where: { userId: { in: employeeIds } },
    select: { id: true, userId: true },
  });
  const profileIds = patientProfiles.map((p) => p.id);
  const profileToUser = new Map(patientProfiles.map((p) => [p.id, p.userId]));

  const since = new Date();
  since.setDate(since.getDate() - LOOKBACK_DAYS);

  const [
    cycleLogCount,
    symptomCheckCount,
    appointmentCount,
    habitLogCount,
    communityPostCount,
    communityCommentCount,
    activeCycleProfiles,
    activeHabitProfiles,
    activeAppointmentProfiles,
    activeSymptomUsers,
  ] = await Promise.all([
    prisma.cycleLog.count({ where: { patientProfileId: { in: profileIds }, createdAt: { gte: since } } }),
    prisma.symptomCheck.count({ where: { userId: { in: employeeIds }, createdAt: { gte: since } } }),
    prisma.appointment.count({ where: { patientProfileId: { in: profileIds }, createdAt: { gte: since } } }),
    prisma.habitLog.count({ where: { patientProfileId: { in: profileIds }, createdAt: { gte: since } } }),
    prisma.communityPost.count({ where: { authorId: { in: employeeIds }, createdAt: { gte: since } } }),
    prisma.communityComment.count({ where: { authorId: { in: employeeIds }, createdAt: { gte: since } } }),
    prisma.cycleLog.findMany({ where: { patientProfileId: { in: profileIds }, createdAt: { gte: since } }, distinct: ["patientProfileId"], select: { patientProfileId: true } }),
    prisma.habitLog.findMany({ where: { patientProfileId: { in: profileIds }, createdAt: { gte: since } }, distinct: ["patientProfileId"], select: { patientProfileId: true } }),
    prisma.appointment.findMany({ where: { patientProfileId: { in: profileIds }, createdAt: { gte: since } }, distinct: ["patientProfileId"], select: { patientProfileId: true } }),
    prisma.symptomCheck.findMany({ where: { userId: { in: employeeIds }, createdAt: { gte: since } }, distinct: ["userId"], select: { userId: true } }),
  ]);

  const activeUserIds = new Set<string>();
  for (const row of activeCycleProfiles) {
    const userId = profileToUser.get(row.patientProfileId);
    if (userId) activeUserIds.add(userId);
  }
  for (const row of activeHabitProfiles) {
    const userId = profileToUser.get(row.patientProfileId);
    if (userId) activeUserIds.add(userId);
  }
  for (const row of activeAppointmentProfiles) {
    const userId = profileToUser.get(row.patientProfileId);
    if (userId) activeUserIds.add(userId);
  }
  for (const row of activeSymptomUsers) {
    activeUserIds.add(row.userId);
  }

  const categories = [
    { name: "Cycle & Symptom Tracking", count: cycleLogCount + symptomCheckCount },
    { name: "Confidential Teleconsultations", count: appointmentCount },
    { name: "Guided Habit Coaching", count: habitLogCount },
    { name: "Peer Community Support", count: communityPostCount + communityCommentCount },
  ].sort((a, b) => b.count - a.count);

  return {
    engagementRate: Math.round((activeUserIds.size / employeeIds.length) * 100),
    activeEmployees: activeUserIds.size,
    totalEmployees: employeeIds.length,
    categories,
  };
}

export default async function CorporateDashboardPage() {
  const session = await getServerSession(authOptions);

  // The layout already verified session.user.email matches an org's
  // contactEmail — re-resolve here since Server Components don't share
  // request-scoped data with their layout without a shared cache/context.
  const org = await prisma.organization.findFirst({
    where: { contactEmail: { equals: session!.user!.email!, mode: "insensitive" } },
    orderBy: { createdAt: "asc" },
    include: { subscription: true },
  });

  if (!org) {
    return null;
  }

  const snapshot = await getOrgWellnessSnapshot(org.id);
  const totalCategoryEvents = snapshot.categories.reduce((sum, c) => sum + c.count, 0);
  const categoryColors = ["bg-teal-500", "bg-rose-400", "bg-purple-500", "bg-amber-500"];

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-teal-600">NauriCare Corporate Care</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-1">{org.name} Wellness Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Aggregate, anonymized usage across your team — never individual records or diagnoses.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Seats Used</CardTitle>
              <Users className="w-4 h-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {org.usedSeats} <span className="text-lg text-gray-400 font-normal">/ {org.allocatedSeats}</span>
              </div>
              <p className="text-xs text-teal-600 mt-1">Allocated seats in use</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Employee Engagement</CardTitle>
              <TrendingUp className="w-4 h-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{snapshot.engagementRate}%</div>
              <p className="text-xs text-rose-600 mt-1">
                {snapshot.activeEmployees} of {snapshot.totalEmployees} active in the last {LOOKBACK_DAYS} days
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Plan Status</CardTitle>
              <ShieldCheck className="w-4 h-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{org.subscription?.status ?? "—"}</div>
              <p className="text-xs text-purple-600 mt-1">{org.subscription?.tier ?? "No plan"} tier</p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-teal-50 p-2 rounded-lg">
              <Activity className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Top Wellness Categories</h3>
              <p className="text-sm text-gray-500">
                Anonymized activity across your team in the last {LOOKBACK_DAYS} days — no individual data is ever shown.
              </p>
            </div>
          </div>

          {totalCategoryEvents === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center text-gray-400">
              <Activity className="w-8 h-8 mb-2 opacity-50" />
              <p>Not enough activity yet to show a breakdown.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {snapshot.categories.map((cat, index) => {
                const pct = Math.round((cat.count / totalCategoryEvents) * 100);
                return (
                  <div key={cat.name} className="relative">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-gray-700">{cat.name}</span>
                      <span className="text-gray-500 font-mono text-xs">{pct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full ${categoryColors[index % categoryColors.length]} transition-all duration-1000 ease-out`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">
          NauriCare never shares individual medical records, diagnoses, or provider conversations with employers.
        </p>
      </div>
    </div>
  );
}
