"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClientValue } from "@/lib/hooks/useClientValue";
import { Sparkles } from "lucide-react";
import { Callout } from "@/components/ui/callout";
import { readPendingClaim } from "@/lib/triage/guestStorage";

/** Portal-wide reminder when a landing-page triage is waiting (e.g. after a magic-link login). */
export function PendingTriageBanner() {
  const pathname = usePathname();
  const action = useClientValue(() => readPendingClaim()?.action ?? null, null);
  if (!action || pathname?.startsWith("/dashboard/symptoms")) return null;
  return (
    <Callout tone="info" icon={Sparkles} title="Your Nauri assessment is waiting" className="mb-6">
      <Link href={`/dashboard/symptoms?action=${action}`} className="font-semibold underline underline-offset-2">
        {action === "referral" ? "Continue to your hospital referral" : "Save it to your health log"}
      </Link>
    </Callout>
  );
}
