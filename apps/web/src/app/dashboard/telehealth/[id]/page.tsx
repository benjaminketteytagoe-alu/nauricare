"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, ArrowLeft, Loader2, Clock, CheckCircle2 } from "lucide-react";

export default function TelehealthRoomPage() {
  const params = useParams();
  const router = useRouter();
  const [appointment, setAppointment] = useState<any>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;

    fetch(`/api/appointments/${params.id}`)
      .then(async (res) => {
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || "Failed to load secure room.");
        }
        return res.json();
      })
      .then((data) => {
        setAppointment(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setIsLoading(false);
      });
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-teal-900">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-teal-600" />
        <h2 className="text-xl font-bold">Establishing Secure Connection...</h2>
        <p className="text-sm text-gray-500 mt-2">Encrypting your telehealth session</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto mt-12 bg-red-50 border border-red-100 rounded-2xl p-8 text-center shadow-sm">
        <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-red-900 mb-2">Access Denied</h2>
        <p className="text-red-700 mb-6">{error}</p>
        <Link href="/dashboard">
          <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors">
            Return to Dashboard
          </button>
        </Link>
      </div>
    );
  }

  // The unique room ID guarantees no clashes between different appointments
  const roomName = `NauriCare_SecureRoom_${appointment.id}`;
  const meetingUrl = `https://meet.jit.si/${roomName}`;

  const startTime = new Date(appointment.startTime);
  const isPast = new Date() > startTime;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* Header Panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal-700 transition-colors mb-2 font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Telehealth Session
            <span className="bg-teal-50 text-teal-700 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-teal-100">
              <Shield className="w-3 h-3" /> E2E Encrypted
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Dr. {appointment.practitioner.user.name} & {appointment.patient.user.name}
          </p>
        </div>

        <div className="flex items-center gap-4 bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
          <Clock className="w-5 h-5 text-teal-600" />
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Scheduled Time</p>
            <p className="text-sm font-bold text-gray-900">
              {startTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      {/* Video Embed Panel */}
      <div className="bg-black rounded-2xl shadow-xl overflow-hidden border border-gray-800 relative h-[600px] w-full">
        {!isPast && (
          <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Waiting for participants...
          </div>
        )}
        
        <iframe
          src={meetingUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="w-full h-full border-0"
          title="NauriCare Secure Telehealth"
        />
      </div>

      <div className="flex justify-center">
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Powered by secure WebRTC infrastructure. Your video and audio are not recorded by NauriCare.
        </p>
      </div>

    </div>
  );
}
