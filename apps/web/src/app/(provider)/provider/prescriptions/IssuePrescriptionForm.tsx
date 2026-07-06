"use client";

import { useState, useTransition } from "react";
import { createPrescription } from "@/actions/prescription";
import { PlusCircle, AlertCircle, CheckCircle2 } from "lucide-react";

interface Patient {
  userId: string;
  name: string;
  email: string;
}

export default function IssuePrescriptionForm({ patients }: { patients: Patient[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    patientId: "",
    medicationName: "",
    dosage: "",
    instructions: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.patientId || !form.medicationName.trim() || !form.dosage.trim()) {
      setError("Patient, medication name, and dosage are all required.");
      return;
    }

    startTransition(async () => {
      const result = await createPrescription({
        patientId: form.patientId,
        medicationName: form.medicationName,
        dosage: form.dosage,
        instructions: form.instructions || undefined,
      });

      if (result.success) {
        setSuccess("Prescription issued successfully. The patient will be notified.");
        setForm({ patientId: "", medicationName: "", dosage: "", instructions: "" });
        setTimeout(() => setSuccess(""), 5000);
      } else {
        setError(result.error ?? "Failed to issue prescription.");
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <PlusCircle className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-slate-900">Issue New Prescription</span>
        </div>
        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
          {isOpen ? "Close" : "Open Form"}
        </span>
      </button>

      {isOpen && (
        <form onSubmit={handleSubmit} className="border-t border-slate-100 p-6 space-y-5">
          {/* Patient */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Patient</label>
            {patients.length === 0 ? (
              <p className="text-sm text-slate-500 italic">
                No patients on your roster yet. Patients appear here after booking a consultation.
              </p>
            ) : (
              <select
                required
                value={form.patientId}
                onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">— Select a patient —</option>
                {patients.map((p) => (
                  <option key={p.userId} value={p.userId}>
                    {p.name} ({p.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Medication name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Medication Name
            </label>
            <input
              required
              type="text"
              placeholder="e.g. Metformin"
              value={form.medicationName}
              onChange={(e) => setForm({ ...form, medicationName: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Dosage */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Dosage & Frequency
            </label>
            <input
              required
              type="text"
              placeholder="e.g. 500 mg twice daily"
              value={form.dosage}
              onChange={(e) => setForm({ ...form, dosage: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Special Instructions{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Take with food. Avoid grapefruit juice."
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-emerald-600 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {success}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || patients.length === 0}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl transition-colors"
            >
              {isPending ? "Issuing…" : "Issue Prescription"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
