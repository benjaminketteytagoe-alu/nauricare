"use client";

import { MessageSquare, Lock } from "lucide-react";
import { useSession } from "next-auth/react";
import { DirectMessageChat } from "@/components/messaging/DirectMessageChat";

export default function PatientMessagesPage() {
  const { data: session } = useSession();

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col lg:h-[calc(100dvh-4rem)]">
      <div className="mb-4 shrink-0 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-ink flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-brand-ink" />
          Messages
        </h1>
        <p className="text-ink-muted mt-1 flex items-center gap-2 text-sm">
          <Lock className="w-4 h-4" />
          Message verified specialists directly, or reply to your care team. Not for emergencies: call 112 / 912.
        </p>
      </div>

      {session?.user?.id ? (
        <DirectMessageChat currentUserId={session.user.id} accentColor="rose" canStartWithProviders />
      ) : (
        <div className="flex-1 flex items-center justify-center text-ink-muted text-sm">Loading session…</div>
      )}
    </div>
  );
}
