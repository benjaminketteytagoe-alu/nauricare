import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Pill, CheckCircle2, Clock, Truck, Store } from "lucide-react";
import IssuePrescriptionForm from "./IssuePrescriptionForm";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  ROUTED: "bg-blue-50 text-blue-700 border-blue-200",
  FULFILLED: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Awaiting Routing",
  ROUTED: "Sent to Pharmacy",
  FULFILLED: "Fulfilled",
};

export default async function ProviderPrescriptionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "PROVIDER") redirect("/login");

  // Load this provider's practitioner profile to query their roster
  const practitioner = await prisma.practitionerProfile.findUnique({
    where: { userId: session.user.id },
  });

  // Roster patients: any patient who has had an appointment with this provider
  const rosterPatients = practitioner
    ? await prisma.patientProfile.findMany({
        where: { appointments: { some: { practitionerProfileId: practitioner.id } } },
        include: { user: { select: { id: true, name: true, email: true } } },
      })
    : [];

  const patients = rosterPatients.map((p) => ({
    userId: p.userId,
    name: p.user.name,
    email: p.user.email,
  }));

  // All prescriptions this provider has issued
  const prescriptions = await prisma.prescription.findMany({
    where: { providerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      patient: { select: { id: true, name: true, email: true } },
      pharmacy: { select: { id: true, name: true, address: true } },
      appointment: { select: { id: true, startTime: true } },
    },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500 p-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Pill className="w-8 h-8 text-blue-600" />
          Prescriptions
        </h1>
        <p className="text-slate-500 mt-1">
          Issue prescriptions to patients and track their fulfilment status.
        </p>
      </div>

      {/* Issue prescription form */}
      <IssuePrescriptionForm patients={patients} />

      {/* Issued prescriptions list */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Issued Prescriptions</h2>

        {prescriptions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Pill className="w-7 h-7 text-slate-300" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Prescriptions Issued Yet</h3>
            <p className="text-slate-500 text-sm mt-1">
              Use the form above to issue your first prescription.
            </p>
          </div>
        ) : (
          prescriptions.map((rx) => {
            const statusStyle = STATUS_STYLES[rx.status] ?? "bg-gray-50 text-gray-600";
            const statusLabel = STATUS_LABELS[rx.status] ?? rx.status;
            const StatusIcon =
              rx.status === "FULFILLED"
                ? CheckCircle2
                : rx.status === "ROUTED"
                  ? Truck
                  : Clock;

            return (
              <div
                key={rx.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="p-5 border-b border-slate-50">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{rx.medicationName}</h3>
                      <p className="text-sm text-slate-600 mt-0.5">
                        <span className="font-medium">Dosage:</span> {rx.dosage}
                      </p>
                      {rx.instructions && (
                        <p className="text-sm text-slate-500 mt-0.5">{rx.instructions}</p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${statusStyle}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusLabel}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>
                      Patient:{" "}
                      <span className="font-medium text-slate-700">{rx.patient.name}</span>
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

                {rx.pharmacy && (
                  <div className="px-5 py-3 bg-slate-50 flex items-center gap-2 text-sm text-slate-600">
                    <Store className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-800">{rx.pharmacy.name}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-xs text-slate-500">{rx.pharmacy.address}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
