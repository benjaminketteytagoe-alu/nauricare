"use client";

import { useState, useEffect } from "react";
import { ActivityTimeline } from "@/components/records/ActivityTimeline";
import { useClientValue } from "@/lib/hooks/useClientValue";
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

function ClinicalRecordsPanel() {
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
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-rose-600" />
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
        <div className="card-surface p-12 text-center">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-rose-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No records yet</h3>
          <p className="text-gray-500 mt-2 max-w-sm mx-auto text-sm">
            Your health records will appear here after your first consultation with a NauriCare provider.
          </p>
          <Link href="/dashboard/providers">
            <button className="mt-6 btn-brand text-sm font-bold px-6 py-3 rounded-xl">
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
                    <div className="flex-1 w-0.5 bg-gray-200 mt-2" />
                  )}
                </div>

                {/* Record card */}
                <div
                  className={`flex-1 bg-white/90 backdrop-blur-sm rounded-2xl border border-rose-100 shadow-sm border-l-4 ${config.accent} overflow-hidden mb-2`}
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
                          className="inline-flex items-center gap-2 text-sm font-bold text-rose-600 hover:text-rose-800 hover:underline transition-colors"
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


const RECORD_TABS = [
  { id: "clinical", label: "Clinical records" },
  { id: "activity", label: "Activity" },
  { id: "ai", label: "AI history" },
] as const;
type RecordTab = (typeof RECORD_TABS)[number]["id"];

export default function RecordsPage() {
  // ?tab=activity|ai deep-links (e.g. from notifications); local state after that.
  const fromUrl = useClientValue(() => new URLSearchParams(window.location.search).get("tab"), null);
  const [chosen, setChosen] = useState<RecordTab | null>(null);
  const tab: RecordTab = chosen ?? (RECORD_TABS.some((t) => t.id === fromUrl) ? (fromUrl as RecordTab) : "clinical");

  function select(id: RecordTab) {
    setChosen(id);
    const url = new URL(window.location.href);
    if (id === "clinical") url.searchParams.delete("tab");
    else url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Records" className="mx-auto flex max-w-3xl gap-1 overflow-x-auto rounded-full border border-slate-200 bg-white p-1 shadow-sm">
        {RECORD_TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => select(t.id)}
            className={`flex-1 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === t.id ? "bg-nc-primary text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "clinical" && <ClinicalRecordsPanel />}
      {tab === "activity" && (
        <div className="mx-auto max-w-3xl space-y-4 pb-16">
          <header>
            <h1 className="text-2xl font-bold text-nc-ink sm:text-3xl">Your activity</h1>
            <p className="mt-1 text-slate-600">Everything you have done on NauriCare: bookings, referrals, consent changes and sign-ins. Only you can see this.</p>
          </header>
          <ActivityTimeline />
        </div>
      )}
      {tab === "ai" && (
        <div className="mx-auto max-w-3xl space-y-4 pb-16">
          <header>
            <h1 className="text-2xl font-bold text-nc-ink sm:text-3xl">AI history</h1>
            <p className="mt-1 text-slate-600">Every symptom check: what you told the AI and what it answered.</p>
          </header>
          <ActivityTimeline types={["AI_TRIAGE"]} expandAi emptyText="You haven't used the symptom guide yet." />
        </div>
      )}
    </div>
  );
}
