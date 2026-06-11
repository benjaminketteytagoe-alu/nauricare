"use client";

import { useState } from "react";
import { ShieldAlert, HeartPulse } from "lucide-react";

export default function OnboardingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    
    // FIX 1: Explicitly parse the cycle string into a strict integer for the Prisma backend
    const cycleInput = formData.get("menstrualCycle");
    const parsedCycle = cycleInput ? parseInt(cycleInput.toString(), 10) : null;

    const data = {
      country: formData.get("country"),
      menstrualCycle: parsedCycle,
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

      // FIX 2: Force a hard browser navigation. This completely destroys the Next.js 
      // client-side cache and forces the server to evaluate your new database profile.
      window.location.href = "/dashboard";
      
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <HeartPulse className="w-12 h-12 text-teal-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Welcome to NauriCare
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Let's set up your health profile to get started.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={onSubmit}>
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                Country of Residence <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="country"
                  name="country"
                  type="text"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                  placeholder="e.g. Rwanda"
                />
              </div>
            </div>

            <div>
              <label htmlFor="menstrualCycle" className="block text-sm font-medium text-gray-700">
                Average Cycle Length (Days)
              </label>
              <div className="mt-1">
                <input
                  id="menstrualCycle"
                  name="menstrualCycle"
                  type="number"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                  placeholder="e.g. 28"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Optional: Helps tailor your health insights.</p>
            </div>

            <div>
              <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700">
                Emergency Contact Number
              </label>
              <div className="mt-1">
                <input
                  id="emergencyContact"
                  name="emergencyContact"
                  type="tel"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                  placeholder="+250 000 000 000"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-colors"
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
