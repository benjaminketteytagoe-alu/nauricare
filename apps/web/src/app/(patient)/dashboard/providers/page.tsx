// apps/web/src/app/dashboard/providers/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Stethoscope, Calendar, Clock, X, CheckCircle2, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProvidersDirectoryPage() {
  const router = useRouter();
  const [providers, setProviders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Booking Modal State
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/providers")
      .then(res => res.json())
      .then(data => {
        // DEFENSIVE CHECK: Ensure data is an array to prevent the .map() crash
        if (Array.isArray(data)) {
          setProviders(data);
        } else {
          console.error("API returned a non-array response. Here is what it sent:", data);
          setProviders([]); // Fallback to an empty array
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setProviders([]);
        setIsLoading(false);
      });
  }, []);

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBooking(true);
    setError("");

    try {
      // Combine date and time into a precise ISO start time
      const startTime = new Date(`${date}T${time}:00`);
      // Standard consultation length: 1 hour
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      if (startTime < new Date()) {
        throw new Error("You cannot book an appointment in the past.");
      }

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          practitionerProfileId: selectedProvider.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          notes
        })
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to book appointment.");
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedProvider(null);
        router.refresh(); // Refresh the layout to show the new appointment
      }, 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-teal-900 flex items-center gap-3">
          <Stethoscope className="w-8 h-8 text-teal-600" />
          Specialist Directory
        </h1>
        <p className="text-gray-500 mt-1">Book a secure telehealth consultation with verified healthcare professionals.</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading specialists...</div>
      ) : providers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900">No Providers Available</h3>
          <p className="text-gray-500">There are currently no verified specialists available for booking. (Or there was an API error! Check the console).</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((provider) => (
            <div key={provider.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md hover:border-teal-100">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-teal-50 text-teal-700 rounded-full flex items-center justify-center font-bold text-xl">
                    {provider.user.name.charAt(0)}
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Dr. {provider.user.name}</h3>
                <p className="text-teal-600 font-medium text-sm mb-3">{provider.specialty}</p>
                <p className="text-gray-600 text-sm line-clamp-3">{provider.bio || "No biography provided."}</p>
              </div>
              <div className="p-4 border-t border-gray-50 bg-gray-50/50">
                <button 
                  onClick={() => setSelectedProvider(provider)}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
                >
                  Book Consultation
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- BOOKING MODAL --- */}
      {selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden relative">
            <button 
              onClick={() => setSelectedProvider(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Book Appointment</h2>
              <p className="text-sm text-gray-500 mt-1">
                Scheduling a telehealth session with Dr. {selectedProvider.user.name}
              </p>
            </div>

            <form onSubmit={handleBookAppointment} className="p-6 space-y-5">
              {success ? (
                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6" />
                  <p className="font-medium">Appointment booked successfully!</p>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" /> Date
                      </label>
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" /> Time
                      </label>
                      <input
                        type="time"
                        required
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason for Visit / Notes (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Briefly describe what you'd like to discuss..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isBooking}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {isBooking ? "Confirming..." : "Confirm Booking"}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
