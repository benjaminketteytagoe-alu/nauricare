"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FlaskConical, ScanSearch, Pill, FileText,
  Stethoscope, ExternalLink, ShieldCheck, Download,
} from "lucide-react";

type HealthRecord = {
  id: string;
  type: string;
  notes: string | null;
  content: string;
  documentUrl: string | null;
  createdAt: string;
  practitioner: {
    user: { name: string };
  };
};

type TypeConfig = {
  Icon: React.ElementType;
  badge: string;
  dot: string;
  accent: string;
};

const TYPE_CONFIG: Record<string, TypeConfig> = {
  "Lab Result":    { Icon: FlaskConical,  badge: "bg-blue-50 text-blue-700",   dot: "border-blue-400 text-blue-500",   accent: "border-l-blue-300" },
  "Imaging":       { Icon: ScanSearch,    badge: "bg-purple-50 text-purple-700",dot: "border-purple-400 text-purple-500",accent: "border-l-purple-300" },
  "Prescription":  { Icon: Pill,          badge: "bg-green-50 text-green-700",  dot: "border-green-400 text-green-500", accent: "border-l-green-300" },
  "Clinical Note": { Icon: FileText,      badge: "bg-teal-50 text-teal-700",    dot: "border-teal-400 text-teal-500",   accent: "border-l-teal-300" },
  "Consultation":  { Icon: Stethoscope,   badge: "bg-amber-50 text-amber-700",  dot: "border-amber-400 text-amber-500", accent: "border-l-amber-300" },
};
const DEFAULT_CONFIG: TypeConfig = {
  Icon: FileText,
  badge: "bg-gray-100 text-gray-600",
  dot:   "border-gray-300 text-gray-400",
  accent:"border-l-gray-200",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function RecordSkeleton() {
  return (
    <div className="flex gap-6 pb-10 animate-pulse">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-12 h-12 rounded-full bg-gray-100" />
        <div className="flex-1 w-0.5 bg-gray-100 mt-3" />
      </div>
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-6 space-y-3 mb-2">
        <div className="h-4 w-24 bg-gray-100 rounded-full" />
        <div className="h-5 w-3/4 bg-gray-200 rounded" />
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-2/3 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

export default function HealthTimelinePage() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/records")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setRecords(data); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500 pb-16">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-teal-900 flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-teal-600" />
          My Health Timeline
        </h1>
        <p className="text-gray-500 mt-1">
          A complete, chronological record of your clinical history.
        </p>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div>
          <RecordSkeleton />
          <RecordSkeleton />
          <RecordSkeleton />
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-teal-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No records yet</h3>
          <p className="text-gray-500 mt-2 max-w-sm mx-auto text-sm">
            Your health records will appear here after your first consultation with a NauriCare provider.
          </p>
          <Link href="/dashboard/providers">
            <button className="mt-6 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold px-6 py-3 rounded-xl transition-colors">
              Book a Consultation
            </button>
          </Link>
        </div>
      ) : (
        <div className="relative">
          {records.map((record, index) => {
            const config = TYPE_CONFIG[record.type] ?? DEFAULT_CONFIG;
            const { Icon } = config;
            const isLast = index === records.length - 1;

            return (
              <div key={record.id} className="flex gap-6 pb-8">

                {/* Timeline spine: dot + vertical line */}
                <div className="flex flex-col items-center shrink-0 w-12">
                  <div
                    className={`w-12 h-12 rounded-full bg-white border-2 flex items-center justify-center shadow-sm z-10 ${config.dot}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  {!isLast && (
                    <div className="flex-1 w-0.5 bg-gradient-to-b from-gray-200 to-gray-100 mt-2" />
                  )}
                </div>

                {/* Record card */}
                <div
                  className={`flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm border-l-4 ${config.accent} overflow-hidden mb-2`}
                >
                  <div className="p-6 space-y-4">

                    {/* Card header */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${config.badge}`}>
                          {record.type}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">
                          {formatDate(record.createdAt)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        Dr. {record.practitioner?.user?.name ?? "Unknown Provider"}
                      </span>
                    </div>

                    {/* Notes (abstract) */}
                    {record.notes && (
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                          Clinical Notes
                        </p>
                        <p className="text-sm text-gray-700 leading-relaxed">{record.notes}</p>
                      </div>
                    )}

                    {/* Content preview */}
                    {record.content && (
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                          Record Summary
                        </p>
                        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                          {record.content}
                        </p>
                      </div>
                    )}

                    {/* Document action */}
                    {record.documentUrl && (
                      <div className="pt-2 border-t border-gray-50">
                        <a
                          href={record.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-bold text-teal-600 hover:text-teal-800 hover:underline transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          View / Download Document
                          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })}

          {/* Timeline end marker */}
          <div className="flex items-center gap-6">
            <div className="w-12 flex justify-center">
              <div className="w-3 h-3 rounded-full bg-gray-200" />
            </div>
            <p className="text-xs text-gray-400 font-medium">Beginning of your health record</p>
          </div>
        </div>
      )}
    </div>
  );
}
