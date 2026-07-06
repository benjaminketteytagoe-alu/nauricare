import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Store, TrendingUp, Package } from "lucide-react";
import PharmacyManagementClient from "./PharmacyManagementClient";

export const dynamic = "force-dynamic";

export default async function AdminPharmaciesPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/login");

  // Aggregate prescriptions routed/fulfilled per pharmacy, ordered by popularity
  const pharmacyStats = await prisma.pharmacy.findMany({
    select: {
      id: true,
      name: true,
      address: true,
      _count: {
        select: {
          prescriptions: {
            where: { status: { in: ["ROUTED", "FULFILLED"] } },
          },
        },
      },
    },
    orderBy: {
      prescriptions: { _count: "desc" },
    },
  });

  const totalRouted = pharmacyStats.reduce((sum, p) => sum + p._count.prescriptions, 0);
  const topPharmacy = pharmacyStats[0];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Partner Pharmacies</h1>
        <p className="text-gray-500 mt-1">
          Prescription routing analytics and pharmacy directory management.
        </p>
      </div>

      {/* ── Analytics section ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-teal-50 p-2 rounded-lg">
            <TrendingUp className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Routing Analytics</h2>
            <p className="text-sm text-gray-500">
              Pharmacies ranked by number of prescriptions routed by patients.
            </p>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              Total Prescriptions Routed
            </p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalRouted}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              Partner Pharmacies
            </p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{pharmacyStats.length}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              Most Popular
            </p>
            <p className="text-lg font-bold text-gray-900 mt-1 truncate">
              {topPharmacy?._count.prescriptions > 0 ? topPharmacy.name : "—"}
            </p>
          </div>
        </div>

        {/* Ranking table */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">
              Prescription Volume by Pharmacy
            </span>
          </div>

          {pharmacyStats.length === 0 || totalRouted === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Store className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm">No prescriptions have been routed yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {pharmacyStats.map((pharmacy, index) => {
                const count = pharmacy._count.prescriptions;
                const pct = totalRouted > 0 ? Math.round((count / totalRouted) * 100) : 0;
                const barColors = [
                  "bg-teal-500",
                  "bg-purple-500",
                  "bg-blue-500",
                  "bg-amber-500",
                  "bg-rose-500",
                ];
                return (
                  <div key={pharmacy.id} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-400 w-5">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{pharmacy.name}</p>
                          <p className="text-xs text-gray-500">{pharmacy.address}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-700 tabular-nums">
                        {count} prescription{count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${barColors[index % barColors.length]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Management section ────────────────────────────────────────── */}
      <PharmacyManagementClient />
    </div>
  );
}
