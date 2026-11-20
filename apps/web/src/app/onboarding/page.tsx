"use client";

import { ShieldAlert, HeartPulse } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OnboardingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);

    // menstrualCycle is stored as String? in Prisma (see PatientProfile.menstrualCycle) —
    // keep it a string here, matching dashboard/settings' read/write of the same field.
    const cycleInput = formData.get("menstrualCycle")?.toString().trim();

    const data = {
      country: formData.get("country"),
      menstrualCycle: cycleInput || null,
      emergencyContact: formData.get("emergencyContact"),
    };

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        // Attempt to parse the exact backend error message for better debugging
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || errData?.message || "Failed to save profile. Please try again.");
      }

      // Drop the client router cache so the (force-dynamic) dashboard renders
      // from the server with the newly saved profile.
      router.refresh();
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <HeartPulse className="w-12 h-12 text-brand-ink" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-ink">Welcome to NauriCare</h2>
        <p className="mt-2 text-center text-sm text-ink-soft">Let&apos;s set up your health profile to get started.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-hairline">
          <form className="space-y-6" onSubmit={onSubmit}>
            {error && (
              <div className="p-3 bg-danger-soft text-danger text-sm rounded-md flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="country" className="block text-sm font-medium text-ink-soft">
                Country of Residence <span className="text-danger">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="country"
                  name="country"
                  type="text"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-field rounded-md shadow-sm placeholder-ink-muted focus:outline-none focus:ring-focus focus:border-brand sm:text-sm"
                  placeholder="e.g. Rwanda"
                />
              </div>
            </div>

            <div>
              <label htmlFor="menstrualCycle" className="block text-sm font-medium text-ink-soft">
                Average Cycle Length (Days)
              </label>
              <div className="mt-1">
                <input
                  id="menstrualCycle"
                  name="menstrualCycle"
                  type="number"
                  className="appearance-none block w-full px-3 py-2 border border-field rounded-md shadow-sm placeholder-ink-muted focus:outline-none focus:ring-focus focus:border-brand sm:text-sm"
                  placeholder="e.g. 28"
                />
              </div>
              <p className="mt-1 text-xs text-ink-muted">Optional: Helps tailor your health insights.</p>
            </div>

            <div>
              <label htmlFor="emergencyContact" className="block text-sm font-medium text-ink-soft">
                Emergency Contact Number
              </label>
              <div className="mt-1">
                <input
                  id="emergencyContact"
                  name="emergencyContact"
                  type="tel"
                  className="appearance-none block w-full px-3 py-2 border border-field rounded-md shadow-sm placeholder-ink-muted focus:outline-none focus:ring-focus focus:border-brand sm:text-sm"
                  placeholder="+250 000 000 000"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-focus disabled:opacity-50 transition-colors"
              >
                {isLoading ? "Saving Profile..." : "Complete Setup"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
