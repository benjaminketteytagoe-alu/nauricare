"use client";

import { useEffect, useState } from "react";
import { Building2, CheckCircle2, XCircle, Users } from "lucide-react";

type SubStatus = "TRIALING" | "VERIFYING" | "ACTIVE" | "EXPIRED" | "CANCELLED";

interface PendingTransaction {
  id: string;
  method: "MOMO" | "STRIPE" | "INVOICE_WIRE";
  status: "PENDING" | "VERIFYING";
  amountCents: number;
  momoTransactionRef: string | null;
  momoPhoneNumber: string | null;
  createdAt: string;
}

interface OrgRow {
  id: string;
  name: string;
  corporateEmailDomain: string;
  contactPersonName: string;
  contactEmail: string;
  allocatedSeats: number;
  usedSeats: number;
  createdAt: string;
  subscription: {
    tier: string;
    billingCycle: string;
    status: SubStatus;
    pricePerSeatMonth: number;
    totalContractValue: number;
    paymentMethod: string;
    currentPeriodEnd: string | null;
  } | null;
  pendingTransactions: PendingTransaction[];
}

const STATUS_BADGE: Record<SubStatus, string> = {
  TRIALING: "bg-purple-50 text-purple-700 border-purple-200",
  VERIFYING: "bg-amber-50 text-amber-700 border-amber-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  EXPIRED: "bg-gray-100 text-gray-500 border-gray-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

export default function AdminCorporatePage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchOrgs = () => {
    fetch("/api/admin/corporate")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error())))
      .then((data: OrgRow[]) => setOrgs(data))
      .catch(() => console.error("Failed to fetch corporate accounts"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const handleReview = async (transactionId: string, action: "APPROVE" | "REJECT") => {
    setProcessingId(transactionId);
    try {
      const res = await fetch(`/api/admin/corporate/${transactionId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        fetchOrgs();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch {
      alert("A network error occurred.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Building2 className="w-8 h-8 text-teal-600" />
          Corporate Care Accounts
        </h1>
        <p className="text-gray-500 mt-1">Review B2B signups, verify payments, and manage seat allocation.</p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-gray-400">Loading…</div>
      ) : orgs.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No corporate accounts yet</h3>
        </div>
      ) : (
        <div className="space-y-4">
          {orgs.map((org) => (
            <div key={org.id} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 flex flex-wrap items-start justify-between gap-4 border-b border-gray-50">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-900">{org.name}</h3>
                    {org.subscription && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_BADGE[org.subscription.status]}`}>
                        {org.subscription.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {org.corporateEmailDomain} · {org.contactPersonName} ({org.contactEmail})
                  </p>
                  {org.subscription && (
                    <p className="text-xs text-gray-500 mt-1">
                      {org.subscription.tier} · {org.subscription.billingCycle} · ${org.subscription.pricePerSeatMonth.toFixed(2)}/seat/mo ·{" "}
                      ${org.subscription.totalContractValue.toFixed(2)} total · {org.subscription.paymentMethod}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg">
                  <Users className="w-4 h-4 text-teal-500" />
                  {org.usedSeats} / {org.allocatedSeats} seats
                </div>
              </div>

              {org.pendingTransactions.length > 0 && (
                <div className="divide-y divide-gray-50">
                  {org.pendingTransactions.map((t) => (
                    <div key={t.id} className="p-4 flex flex-wrap items-center justify-between gap-3 bg-amber-50/30">
                      <div className="text-sm">
                        <span className="font-semibold text-gray-900">{t.method}</span>{" "}
                        <span className="text-gray-500">— ${(t.amountCents / 100).toFixed(2)}</span>
                        {t.momoTransactionRef && (
                          <span className="ml-2 font-mono text-xs text-gray-600">ref: {t.momoTransactionRef}</span>
                        )}
                        {t.momoPhoneNumber && <span className="ml-2 text-xs text-gray-500">{t.momoPhoneNumber}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReview(t.id, "REJECT")}
                          disabled={processingId === t.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                        <button
                          onClick={() => handleReview(t.id, "APPROVE")}
                          disabled={processingId === t.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {processingId === t.id ? "Processing…" : "Approve"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
