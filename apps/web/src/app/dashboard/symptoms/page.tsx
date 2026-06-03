"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Activity, Brain, AlertCircle, Heart } from "lucide-react";

const COMMON_SYMPTOMS = [
  "Cramps", "Bloating", "Headache", "Fatigue", 
  "Heavy Bleeding", "Spotting", "Nausea", "Mood Swings",
  "Lower Back Pain", "Breast Tenderness", "Insomnia", "Acne"
];

export default function SymptomLoggerPage() {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [cycleDay, setCycleDay] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<{ insight: string; riskLevel: string } | null>(null);
  const [error, setError] = useState("");

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) => 
      prev.includes(symptom) 
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    );
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedSymptoms.length === 0) {
      setError("Please select at least one symptom to log.");
      return;
    }

    setLoading(true);
    setError("");
    setAiResponse(null);

    try {
      const res = await fetch("/api/symptoms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          symptoms: selectedSymptoms, 
          cycleDay: parseInt(cycleDay) || 0, 
          notes 
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to log symptoms.");

      setAiResponse({
        insight: data.aiInsight,
        riskLevel: data.log.riskLevel,
      });
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Navigation */}
        <Link href="/dashboard" className="text-teal-700 hover:text-teal-900 flex items-center gap-2 font-medium w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-teal-900 p-6 text-white">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="w-6 h-6 text-teal-300" /> Daily Health Log
            </h1>
            <p className="text-teal-100 mt-1">Track how you are feeling today to build a better picture of your reproductive health.</p>
          </div>

          <div className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">{error}</div>}

              {/* Symptom Selection */}
              <div className="space-y-3">
                <Label className="text-base font-semibold text-gray-900">What are you experiencing today?</Label>
                <div className="flex flex-wrap gap-3 mt-2">
                  {COMMON_SYMPTOMS.map((symptom) => {
                    const isSelected = selectedSymptoms.includes(symptom);
                    return (
                      <button
                        key={symptom}
                        type="button"
                        onClick={() => toggleSymptom(symptom)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                          isSelected 
                            ? "bg-teal-600 border-teal-600 text-white shadow-sm" 
                            : "bg-white border-gray-200 text-gray-700 hover:border-teal-300 hover:bg-teal-50"
                        }`}
                      >
                        {symptom}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cycle Context */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="cycleDay" className="text-sm font-semibold text-gray-900">Cycle Day (Optional)</Label>
                  <Input 
                    id="cycleDay" 
                    type="number" 
                    min="1" 
                    max="100" 
                    placeholder="e.g., 14" 
                    value={cycleDay}
                    onChange={(e) => setCycleDay(e.target.value)}
                    className="h-11 focus-visible:ring-teal-600" 
                  />
                  <p className="text-xs text-gray-500">Day 1 is the first day of your period.</p>
                </div>
              </div>

              {/* Personal Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-semibold text-gray-900">Additional Notes</Label>
                <textarea 
                  id="notes" 
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any emotional changes, triggers, or severity details..." 
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full md:w-auto h-11 px-8 bg-teal-600 hover:bg-teal-700 text-white">
                {loading ? "Analyzing Context..." : "Save Daily Log"}
              </Button>
            </form>
          </div>
        </div>

        {/* Gemini AI Response Area */}
        {aiResponse && (
          <div className="bg-white rounded-xl shadow-sm border border-teal-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={`p-4 border-b flex items-center gap-2 font-semibold ${
              aiResponse.riskLevel === 'High' ? 'bg-rose-50 text-rose-800 border-rose-100' : 
              aiResponse.riskLevel === 'Medium' ? 'bg-amber-50 text-amber-800 border-amber-100' : 
              'bg-teal-50 text-teal-800 border-teal-100'
            }`}>
              {aiResponse.riskLevel === 'High' ? <AlertCircle className="w-5 h-5" /> : <Heart className="w-5 h-5" />}
              NauriCare AI Insight (Risk Level: {aiResponse.riskLevel})
            </div>
            <div className="p-6 flex gap-4 text-gray-700 leading-relaxed">
              <Brain className="w-6 h-6 text-teal-600 shrink-0 mt-1" />
              <p>{aiResponse.insight}</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
