"use client";

import { ArrowLeft, FileText, Plus, Save, FlaskConical, Pill } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function PatientMedicalRecordPage() {
  const params = useParams();
  const router = useRouter();

  const [records, setRecords] = useState<{ type: string; content: string }[]>([]);

  const [isAdding, setIsAdding] = useState(false);
  const [newRecordType, setNewRecordType] = useState("NOTE");
  const [newRecordContent, setNewRecordContent] = useState("");

  // In a real app, you'd fetch the patient profile and their records here via a GET endpoint.
  // For this prototype, we'll focus on the submission flow.

  const handleSaveRecord = async () => {
    try {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientProfileId: params.patientId,
          type: newRecordType,
          content: newRecordContent,
        }),
      });

      if (res.ok) {
        const savedRecord = await res.json();
        setRecords([savedRecord, ...records]);
        setIsAdding(false);
        setNewRecordContent("");
      }
    } catch (error) {
      console.error("Failed to save record", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      <button
        onClick={() => router.push("/provider/roster")}
        className="flex items-center gap-2 text-sm text-ink-muted hover:text-info font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Roster
      </button>

      <div className="bg-surface rounded-2xl border border-hairline shadow-sm p-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-ink">Patient Medical File</h1>
          <p className="text-ink-muted text-sm mt-1">ID: {params.patientId}</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-info hover:bg-info text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
        >
          {isAdding ? (
            "Cancel Entry"
          ) : (
            <>
              <Plus className="w-4 h-4" /> New Record
            </>
          )}
        </button>
      </div>

      {isAdding && (
        <div className="bg-info-soft border border-info-line rounded-2xl p-6 space-y-4">
          <div className="flex gap-4">
            {["NOTE", "LAB_RESULT", "PRESCRIPTION"].map((type) => (
              <button
                key={type}
                onClick={() => setNewRecordType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${newRecordType === type ? "bg-info text-white" : "bg-surface text-ink-soft border border-hairline"}`}
              >
                {type === "NOTE" ? (
                  <FileText className="w-4 h-4" />
                ) : type === "LAB_RESULT" ? (
                  <FlaskConical className="w-4 h-4" />
                ) : (
                  <Pill className="w-4 h-4" />
                )}
                {type.replace("_", " ")}
              </button>
            ))}
          </div>
          <textarea
            rows={5}
            placeholder="Enter clinical notes, lab results, or prescription details..."
            value={newRecordContent}
            onChange={(e) => setNewRecordContent(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-info-line focus:ring-2 focus:ring-focus outline-none resize-none"
          />
          <div className="flex justify-end">
            <button
              onClick={handleSaveRecord}
              className="bg-surface-inverse text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save to EHR
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {records.length === 0 ? (
          <div className="text-center py-12 text-ink-muted bg-surface rounded-2xl border border-hairline">
            No records found for this patient.
          </div>
        ) : (
          records.map((rec, i) => (
            <div key={i} className="bg-surface p-5 rounded-2xl border border-hairline shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold px-2 py-1 bg-surface-muted text-ink-soft rounded uppercase">
                  {rec.type.replace("_", " ")}
                </span>
                <span className="text-xs text-ink-muted">Just now</span>
              </div>
              <p className="text-ink text-sm whitespace-pre-wrap">{rec.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
