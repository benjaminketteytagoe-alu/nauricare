"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { SPRING, tactile } from "./motion";

// Withdrawing must be as easy as agreeing (Law Nº 058/2021), so it lives
// one tap away on the symptom guide itself, with a single confirmation step.
export function ConsentStatusBar({ grantedAt }: { grantedAt: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const date = new Date(grantedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  async function withdraw() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/consent", { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("We couldn't withdraw your consent. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="font-friendly mx-auto mb-6 max-w-3xl rounded-3xl border border-[#FFE4E6] bg-white px-5 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="flex items-center gap-2 text-[#475569]">
          <ShieldCheck className="h-4 w-4 text-[#1D4ED8]" aria-hidden />
          You agreed to AI triage on {date}.
        </p>
        <AnimatePresence mode="wait" initial={false}>
          {confirming ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={SPRING}
              className="flex items-center gap-2"
            >
              <span className="text-[#0F172A]">Stop AI triage?</span>
              <motion.button
                type="button"
                {...tactile}
                onClick={withdraw}
                disabled={busy}
                className="rounded-full bg-[#BE123C] px-4 py-1.5 font-semibold text-white shadow-sm hover:shadow-md disabled:opacity-50"
              >
                {busy ? "Withdrawing…" : "Withdraw"}
              </motion.button>
              <motion.button
                type="button"
                {...tactile}
                onClick={() => setConfirming(false)}
                className="rounded-full px-4 py-1.5 font-semibold text-[#475569] hover:bg-[#FDF2F0]"
              >
                Keep
              </motion.button>
            </motion.div>
          ) : (
            <motion.button
              key="manage"
              type="button"
              {...tactile}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirming(true)}
              className="rounded-full px-4 py-1.5 font-semibold text-[#1D4ED8] hover:bg-blue-50"
            >
              Withdraw consent
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      {error && <p role="alert" className="mt-2 text-sm font-medium text-[#BE123C]">{error}</p>}
    </div>
  );
}
