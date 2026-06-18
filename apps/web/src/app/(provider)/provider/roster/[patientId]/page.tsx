"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, Plus, Save, FlaskConical, Pill } from "lucide-react";

export default function PatientMedicalRecordPage() {
  const params = useParams();
  const router = useRouter();
  
  const [, setPatient] = useState<Record<string, unknown> | null>(null);
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
          content: newRecordContent
        })
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
      <button onClick={() => router.push('/provider/roster')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-700 font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Roster
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patient Medical File</h1>
          <p className="text-slate-500 text-sm mt-1">ID: {params.patientId}</p>
        </div>
        <button onClick={() => setIsAdding(!isAdding)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          {isAdding ? "Cancel Entry" : <><Plus className="w-4 h-4"/> New Record</>}
        </button>
      </div>

      {isAdding && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 space-y-4">
          <div className="flex gap-4">
            {['NOTE', 'LAB_RESULT', 'PRESCRIPTION'].map(type => (
              <button 
                key={type} onClick={() => setNewRecordType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${newRecordType === type ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
              >
                {type === 'NOTE' ? <FileText className="w-4 h-4"/> : type === 'LAB_RESULT' ? <FlaskConical className="w-4 h-4"/> : <Pill className="w-4 h-4"/>}
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>
          <textarea 
            rows={5}
            placeholder="Enter clinical notes, lab results, or prescription details..."
            value={newRecordContent}
            onChange={(e) => setNewRecordContent(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />
          <div className="flex justify-end">
            <button onClick={handleSaveRecord} className="bg-slate-900 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2">
              <Save className="w-4 h-4"/> Save to EHR
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {records.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-100">No records found for this patient.</div>
        ) : (
          records.map((rec, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded uppercase">{rec.type.replace('_', ' ')}</span>
                <span className="text-xs text-slate-400">Just now</span>
              </div>
              <p className="text-slate-800 text-sm whitespace-pre-wrap">{rec.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
