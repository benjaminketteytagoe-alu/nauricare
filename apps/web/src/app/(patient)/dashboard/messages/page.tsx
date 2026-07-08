"use client";

import { useSession } from "next-auth/react";
import { MessageSquare, Lock } from "lucide-react";
import { DirectMessageChat } from "@/components/DirectMessageChat";

export default function PatientMessagesPage() {
  const { data: session } = useSession();

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6 shrink-0">
        <h1 className="text-3xl font-bold text-teal-900 flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-teal-600" />
          Messages
        </h1>
        <p className="text-gray-500 mt-1 flex items-center gap-2 text-sm">
          <Lock className="w-4 h-4" />
          Securely message providers you have an appointment with.
        </p>
      </div>

      {session?.user?.id ? (
        <DirectMessageChat currentUserId={session.user.id} accentColor="teal" />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Loading session…
        </div>
      )}
    </div>
  );
}
