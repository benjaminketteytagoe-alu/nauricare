"use client";

import { useEffect, useId, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { ConsentToggle } from "@/components/triage-gate/ConsentToggle";
import { SPRING, tactile } from "@/components/triage-gate/motion";
import { CURRENT_CONSENT_VERSION } from "@/lib/consentVersion";
import { saveGuestConsent } from "@/lib/triage/guestStorage";

const CalmAnimation = dynamic(() => import("@/components/triage-gate/CalmAnimation"), {
  ssr: false,
  loading: () => <div className="h-full w-full rounded-full bg-[#FDE2E4]/60" aria-hidden />,
});

/**
 * Consent pre-check for signed-out visitors (Rwanda Law Nº 058/2021).
 * Recorded in localStorage with the notice version; the account-level,
 * audited consent is asked for again after sign-up.
 */
export function GuestConsentModal({
  open,
  onAccept,
  onDismiss,
}: {
  open: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const titleId = useId();
  const reduceMotion = useReducedMotion();
  const [privacy, setPrivacy] = useState(false);
  const [triage, setTriage] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDismiss();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);

  function accept() {
    if (!privacy || !triage) return;
    saveGuestConsent(CURRENT_CONSENT_VERSION);
    onAccept();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
            initial={reduceMotion ? false : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={SPRING}
            className="font-friendly relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-[#FFFDF9] p-6 text-left shadow-xl sm:rounded-[2rem] sm:p-8"
          >
            <button type="button" onClick={onDismiss} aria-label="Close" className="absolute right-4 top-4 rounded-full p-2 text-[#475569] hover:bg-[#FDF2F0]">
              <X className="h-5 w-5" aria-hidden />
            </button>

            <div className="mx-auto h-24 w-24 rounded-full border border-[#FFE4E6] bg-white p-2 shadow-sm">
              <CalmAnimation />
            </div>
            <h2 id={titleId} className="mt-5 text-center text-2xl font-bold leading-snug text-[#0F172A]">
              Before Nauri listens
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-relaxed text-[#475569]">
              Nauri is an AI guide, not a doctor. Please read and agree to how we handle what you share.
            </p>

            <div className="mt-6 space-y-3">
              <ConsentToggle checked={privacy} onChange={setPrivacy} title="I agree to the processing of my health information">
                What I type is processed to give me guidance. Nothing is saved to an account unless I sign up. See the{" "}
                <Link href="/privacy" target="_blank" className="font-medium text-[#1D4ED8] underline underline-offset-2">Privacy Policy</Link>.
              </ConsentToggle>
              <ConsentToggle checked={triage} onChange={setTriage} title="I understand how AI triage works">
                It is not a diagnosis and can be wrong. My text is sent to Google&apos;s MedGemma or Gemini models, which may
                process it outside Rwanda. In an emergency I will call 112 / 912. See the{" "}
                <Link href="/consent" target="_blank" className="font-medium text-[#1D4ED8] underline underline-offset-2">Informed Consent</Link>.
              </ConsentToggle>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <motion.button type="button" {...tactile} onClick={onDismiss} className="rounded-full px-6 py-3 text-sm font-semibold text-[#475569] hover:bg-[#FDF2F0]">
                Not now
              </motion.button>
              <motion.button
                type="button"
                {...(privacy && triage ? tactile : { transition: SPRING })}
                onClick={accept}
                disabled={!privacy || !triage}
                className="rounded-full bg-[#1D4ED8] px-8 py-3 text-sm font-semibold text-white shadow-sm transition-[background-color,opacity] hover:bg-[#1E40AF] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
              >
                Agree and continue
              </motion.button>
            </div>
            <p className="mt-4 text-center text-xs text-[#475569]">Consent notice version {CURRENT_CONSENT_VERSION}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
