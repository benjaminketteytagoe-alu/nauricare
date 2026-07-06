"use client";

import { useState, useEffect, useTransition } from "react";
import { useSession } from "next-auth/react";
import { Pill, Store, CheckCircle2, Clock, Truck, ChevronDown, AlertCircle } from "lucide-react";
import { routeToPharmacy } from "@/actions/prescription";

interface PharmacyOption {
  id: string;
  name: string;
  address: string;
  tags: string[];
}

interface Prescription {
  id: string;
  medicationName: string;
  dosage: string;
  instructions: string | null;
  status: "PENDING" | "ROUTED" | "FULFILLED";
  createdAt: string;
  provider: { id: string; name: string };
  pharmacy: { id: string; name: string; address: string } | null;
}

const STATUS_BADGE: Record<Prescription["status"], { label: string; class: string; icon: React.ReactNode }> = {
  PENDING: {
    label: "Awaiting Routing",
    class: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <Clock className="w-3 h-3" />,
  },
  ROUTED: {
    label: "Sent to Pharmacy",
    class: "bg-blue-50 text-blue-700 border-blue-200",
    icon: <Truck className="w-3 h-3" />,
  },
  FULFILLED: {
    label: "Ready for Pickup",
    class: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
};

export default function PatientPrescriptionsPage() {
  const { data: session } = useSession();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [pharmacies, setPharmacies] = useState<PharmacyOption[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  // Per-card routing state: { [prescriptionId]: selectedPharmacyId }
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [routingId, setRoutingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!session?.user?.id) return;
    Promise.all([
      fetch("/api/prescriptions").then((r) => r.json()),
      fetch("/api/pharmacies").then((r) => r.json()),
    ])
      .then(([rxData, phData]) => {
        setPrescriptions(Array.isArray(rxData) ? rxData : []);
        setPharmacies(Array.isArray(phData) ? phData : []);
      })
      .catch(() => {})
      .finally(() => setIsFetching(false));
  }, [session]);

  const handleRoute = (prescriptionId: string) => {
    const pharmacyId = selections[prescriptionId];
    if (!pharmacyId) {
      setErrors((prev) => ({ ...prev, [prescriptionId]: "Please select a pharmacy first." }));
      return;
    }
    setErrors((prev) => ({ ...prev, [prescriptionId]: "" }));
    setRoutingId(prescriptionId);

    startTransition(async () => {
      const result = await routeToPharmacy(prescriptionId, pharmacyId);
      if (result.success) {
        const pharmacy = pharmacies.find((p) => p.id === pharmacyId);
        setPrescriptions((prev) =>
          prev.map((rx) =>
            rx.id === prescriptionId
              ? {
                  ...rx,
                  status: "ROUTED",
                  pharmacy: pharmacy
                    ? { id: pharmacy.id, name: pharmacy.name, address: pharmacy.address }
                    : null,
                }
              : rx,
          ),
        );
      } else {
        setErrors((prev) => ({ ...prev, [prescriptionId]: result.error ?? "Failed to route." }));
      }
      setRoutingId(null);
    });
  };

  if (isFetching) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center text-gray-400">
        Loading your prescriptions…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-teal-900 flex items-center gap-3">
          <Pill className="w-8 h-8 text-teal-600" />
          My Prescriptions
        </h1>
        <p className="text-gray-500 mt-1">
          Review prescriptions from your providers and send them to a partner pharmacy.
        </p>
      </div>

      {prescriptions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Pill className="w-8 h-8 text-teal-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No Prescriptions Yet</h3>
          <p className="text-gray-500 mt-1 text-sm">
            Your provider will issue prescriptions after a consultation.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((rx) => {
            const badge = STATUS_BADGE[rx.status];
            const isThisRouting = routingId === rx.id && isPending;

            return (
              <div
                key={rx.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* Header */}
                <div className="p-5 border-b border-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{rx.medicationName}</h3>
                      <p className="text-sm text-gray-600 mt-0.5">
                        <span className="font-medium">Dosage:</span> {rx.dosage}
                      </p>
                      {rx.instructions && (
                        <p className="text-sm text-gray-500 mt-0.5">
                          <span className="font-medium">Instructions:</span> {rx.instructions}
                        </p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${badge.class}`}
                    >
                      {badge.icon}
                      {badge.label}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>
                      Issued by <span className="font-medium text-gray-700">Dr. {rx.provider.name}</span>
                    </span>
                    <span>
                      {new Date(rx.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {/* Pharmacy section */}
                <div className="p-5 bg-gray-50/50">
                  {rx.status === "PENDING" ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Store className="w-4 h-4 text-gray-400" />
                        Select a Partner Pharmacy
                      </p>
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <select
                            value={selections[rx.id] ?? ""}
                            onChange={(e) =>
                              setSelections((prev) => ({ ...prev, [rx.id]: e.target.value }))
                            }
                            className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                          >
                            <option value="">— Choose a pharmacy —</option>
                            {pharmacies.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} · {p.address}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-3 pointer-events-none" />
                        </div>
                        <button
                          onClick={() => handleRoute(rx.id)}
                          disabled={isThisRouting}
                          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                          {isThisRouting ? "Routing…" : "Route"}
                        </button>
                      </div>
                      {errors[rx.id] && (
                        <p className="text-xs text-rose-600 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors[rx.id]}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Store className="w-4 h-4 text-gray-400 shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-900">{rx.pharmacy?.name}</p>
                        <p className="text-xs text-gray-500">{rx.pharmacy?.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
