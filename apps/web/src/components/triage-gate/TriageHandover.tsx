"use client";

import { useEffect, useRef, useState } from "react";
import { useClientValue } from "@/lib/hooks/useClientValue";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Callout } from "@/components/ui/callout";
import { clearPendingTriage, readPendingClaim } from "@/lib/triage/guestStorage";

// Serialised so the snapshot is a stable primitive between renders.
const readClaimSnapshot = () => JSON.stringify(readPendingClaim());

/**
 * Finishes the landing-page → account hand-over. Before account consent it
 * explains why the gate is showing; once consent is valid it claims the
 * sealed triage and routes into the referral wizard (or the health log).
 */
export function TriageHandover({ consentValid }: { consentValid: boolean }) {
  const router = useRouter();
  const snapshot = useClientValue(readClaimSnapshot, "null");
  const pending = JSON.parse(snapshot) as ReturnType<typeof readPendingClaim>;
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (!consentValid || !pending || started.current) return;
    started.current = true;
    (async () => {
      try {
        const res = await fetch("/api/triage/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ claimToken: pending.token }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 410) {
          clearPendingTriage();
          setError(data.error ?? "Your Nauri assessment expired. Please describe your symptoms again below.");
          return;
        }
        if (!res.ok || !data.checkId) throw new Error(data.error);
        clearPendingTriage();
        router.replace(
          pending.action === "save"
            ? "/dashboard/symptoms?saved=1"
            : `/dashboard/referrals/new?checkId=${encodeURIComponent(data.checkId)}`,
        );
      } catch (e) {
        started.current = false;
        setError(e instanceof Error && e.message ? e.message : "We couldn't bring your Nauri assessment across. Please try again.");
      }
    })();
  }, [consentValid, pending, router]);

  if (error) return <Callout tone="warning" role="alert" className="mx-auto mb-6 max-w-3xl">{error}</Callout>;
  if (!pending) return null;

  if (!consentValid) {
    return (
      <Callout tone="info" icon={Sparkles} title="Your Nauri assessment is ready to save" className="mx-auto mb-6 max-w-3xl">
        Welcome to NauriCare. Confirm your consent below once more to link the assessment to your new account. We&apos;ll
        then take you straight to your hospital referral.
      </Callout>
    );
  }

  return (
    <div role="status" className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-3 bg-white/90 text-nc-ink backdrop-blur-sm">
      <Loader2 className="h-8 w-8 animate-spin text-nc-primary" aria-hidden />
      <p className="font-semibold">Bringing your Nauri assessment across…</p>
    </div>
  );
}
