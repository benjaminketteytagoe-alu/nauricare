import { Download } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const revalidate = 0; // Force dynamic rendering so every single system log shows instantly

export default async function AdminAuditLogsPage() {
  // Query the database to retrieve all compliance logs, including actor details
  const logs = await prisma.auditLog.findMany({
    include: {
      actor: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Panel */}
      <div className="border-b pb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security & Compliance Audit Logs</h1>
          <p className="text-gray-500 mt-1">
            Immutable historic ledger capturing platform administrative transactions and validation adjustments.
          </p>
        </div>
        {/* Plain <a> tag — Content-Disposition: attachment on the API response
            triggers the browser download without any client-side JavaScript. */}
        <a
          href="/api/admin/audit-logs/export"
          className="shrink-0 inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition-all"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </a>
      </div>

      {/* Main Logs Table Container */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium">Action Event</th>
                <th className="px-6 py-4 font-medium">Executed By</th>
                <th className="px-6 py-4 font-medium">Target Resource ID</th>
                <th className="px-6 py-4 font-medium">IP Address</th>
                <th className="px-6 py-4 font-medium">Metadata Payload Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    No historic audit ledger activities currently committed to the system database.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/40 transition-colors align-top">
                    {/* Timestamp column formatted locally */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-400">
                      {new Date(log.createdAt).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    
                    {/* Action event tag indicator with dynamic badge values */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold border ${
                        log.action === "PROVIDER_VERIFY"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : log.action === "PROVIDER_REGISTER"
                          ? "bg-teal-50 text-teal-700 border-teal-100"
                          : "bg-slate-50 text-slate-700 border-slate-100"
                      }`}>
                        {log.action}
                      </span>
                    </td>

                    {/* Actor Identity Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{log.actor.name || "System Admin"}</div>
                      <div className="text-xs text-gray-400 font-normal">{log.actor.email}</div>
                    </td>

                    {/* Affected target ID string */}
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-400">
                      {log.targetId ? `${log.targetId.slice(0, 15)}...` : "GLOBAL_SCOPE"}
                    </td>

                    {/* Forensics Network IP Address */}
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-500">
                      {log.ipAddress || "0.0.0.0"}
                    </td>

                    {/* Structured Metadata Snapshot View Block */}
                    <td className="px-6 py-4 max-w-md">
                      {log.details ? (
                        <pre className="text-xs font-mono bg-gray-50 border border-gray-100 rounded p-2 overflow-x-auto text-gray-600 max-h-32">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No supplemental payload data.</span>
                      )}
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
