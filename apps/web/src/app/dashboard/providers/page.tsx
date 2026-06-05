"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope, MapPin, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PatientProvidersDirectory() {
  const router = useRouter();
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const res = await fetch("/api/providers");
        if (res.ok) {
          const data = await res.json();
          setProviders(data);
        }
      } catch (err) {
        console.error("Error fetching providers", err);
      }
    };
    fetchProviders();
  }, []);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const appointmentDate = new Date(`${date}T${time}:00`);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // THE FIX: We are now sending the precise Clinical Profile ID
          practitionerId: selectedProvider.practitionerProfile?.id,
          date: appointmentDate.toISOString(),
        }),
      });

      if (res.ok) {
        alert("Appointment booked successfully! Your video link has been generated.");
        setSelectedProvider(null);
        router.push("/dashboard"); 
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (error) {
      alert("Network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-teal-900">Specialist Directory</h1>
        <p className="text-gray-500 mt-1">Find a specialist and book a secure video consultation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {providers.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-xl border border-teal-100">
            <Stethoscope className="w-8 h-8 text-teal-200 mx-auto mb-3 animate-pulse" />
            <p className="text-gray-500 font-medium">Loading available specialists...</p>
          </div>
        ) : (
          providers.map((provider) => (
            <div key={provider.id} className="bg-white border border-teal-100 rounded-xl shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center mb-4 text-teal-600">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Dr. {provider.name}</h3>
              <p className="text-teal-600 text-sm font-medium mb-3">
                {provider.practitionerProfile?.specialty || "Specialist"}
              </p>
              
              <div className="space-y-2 mb-6 flex-1">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Video className="w-4 h-4 text-teal-400" /> Telehealth Available
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <MapPin className="w-4 h-4 text-teal-400" /> {provider.practitionerProfile?.location || "Remote"}
                </div>
              </div>

              <Button 
                onClick={() => setSelectedProvider(provider)}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              >
                Book Consultation
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Booking Modal Overlay */}
      {selectedProvider && (
        <div className="fixed inset-0 bg-teal-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Book Appointment</h2>
              <button onClick={() => setSelectedProvider(null)} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 bg-teal-50/50 border-b border-teal-100">
              <p className="font-medium text-teal-900">Dr. {selectedProvider.name}</p>
              <p className="text-sm text-teal-600">{selectedProvider.practitionerProfile?.specialty}</p>
            </div>

            <form onSubmit={handleBook} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Date</label>
                <input 
                  type="date" 
                  required 
                  min={new Date().toISOString().split("T")[0]}
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                  className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Time</label>
                <input 
                  type="time" 
                  required 
                  value={time} 
                  onChange={(e) => setTime(e.target.value)} 
                  className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none" 
                />
              </div>
              
              <div className="pt-2">
                <Button type="submit" disabled={isLoading} className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white text-base">
                  {isLoading ? "Generating Secure Link..." : "Confirm Booking"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
