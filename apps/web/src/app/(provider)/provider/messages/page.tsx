"use client";

import { useSession } from "next-auth/react";
import { MessageSquare, Lock } from "lucide-react";
import { DirectMessageChat } from "@/components/DirectMessageChat";

export default function ProviderMessagesPage() {
  const { data: session } = useSession();

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6 shrink-0">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-blue-600" />
          Secure Messages
        </h1>
        <p className="text-slate-500 mt-1 flex items-center gap-2 text-sm">
          <Lock className="w-4 h-4" />
          Appointment-gated messaging — only patients with a shared appointment can exchange messages.
        </p>
      </div>

      {session?.user?.id ? (
        <DirectMessageChat currentUserId={session.user.id} accentColor="blue" />
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          Loading session…
        </div>
      )}
    </div>
  );
}
