"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Wallet } from "lucide-react";

interface MomoTransactionRow {
  id: string;
  createdAt: string;
  userName: string;
  userEmail: string;
  planName: string;
  tier: string;
  amountCents: number;
  currency: string;
  momoTransactionRef: string | null;
  momoPhoneNumber: string | null;
}

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<MomoTransactionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRows = () => {
    fetch("/api/admin/payments")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error())))
      .then((data: MomoTransactionRow[]) => setRows(data))
      .catch(() => console.error("Failed to fetch pending MoMo transactions"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const handleReview = async (id: string, action: "APPROVE" | "REJECT") => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/payments/momo/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setRows((prev) => prev.filter((r) => r.id !== id));
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
          <Wallet className="w-8 h-8 text-teal-600" />
          MoMo Payment Verification
        </h1>
        <p className="text-gray-500 mt-1">
          Review reference codes submitted by patients against your MTN MoMo merchant dashboard before approving.
        </p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium">Patient</th>
                <th className="px-6 py-4 font-medium">Plan</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Reference Code</th>
                <th className="px-6 py-4 font-medium">MoMo Phone</th>
                <th className="px-6 py-4 font-medium text-right">Review</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">Loading…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">Nothing pending review</h3>
                    <p className="text-sm mt-1">Submitted MoMo reference codes will appear here.</p>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{row.userName}</div>
                      <div className="text-xs text-gray-400">{row.userEmail}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100">
                        {row.planName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-medium">
                      ${(row.amountCents / 100).toFixed(2)} {row.currency}
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-700">{row.momoTransactionRef}</td>
                    <td className="px-6 py-4 text-gray-600">{row.momoPhoneNumber || "N/A"}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleReview(row.id, "REJECT")}
                          disabled={processingId === row.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                        <button
                          onClick={() => handleReview(row.id, "APPROVE")}
                          disabled={processingId === row.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {processingId === row.id ? "Processing…" : "Approve"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
