"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Hospital, Loader2, RotateCcw, Send, Siren, Stethoscope } from "lucide-react";
import { tactile } from "@/components/triage-gate/motion";
import { Callout } from "@/components/ui/callout";
import { SEVERITY_TONE, StatusChip } from "@/components/ui/status-chip";
import { CURRENT_CONSENT_VERSION } from "@/lib/consentVersion";
import { EMERGENCY_NUMBERS } from "@/lib/site";
import type { TriageOutcome, TriageResult } from "@/lib/triage/engine";
import { hasGuestConsent, savePendingTriage, type HandoverAction } from "@/lib/triage/guestStorage";
import { GuestConsentModal } from "./GuestConsentModal";

const SYMPTOM_PILLS = [
  "Severe menstrual cramping",
  "Early pregnancy check",
  "Irregular cycles",
  "Heavy bleeding",
  "Pelvic pain",
];

const OUTCOME_COPY: Record<TriageOutcome, { title: string; body: string }> = {
  SPECIALIST_REQUIRED: { title: "Specialist care needed", body: "Please see a specialist soon. If symptoms are severe, get emergency care now." },
  ROUTINE_CONSULT: { title: "Book a consultation", body: "A clinician should look at this in the next few days." },
  SELF_CARE: { title: "Self-care for now", body: "Nothing you shared matches our warning signs. Keep tracking how you feel." },
};

interface GuestTriageResponse {
  triage: TriageResult;
  triageOutcome: TriageOutcome;
  claimToken: string;
  claimExpiresAt: number;
}

export function NauriTriageCard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GuestTriageResponse | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Runs `action` now if consent is already on record, otherwise after the
  // visitor accepts in the consent modal.
  function withConsent(action: () => void) {
    if (hasGuestConsent(CURRENT_CONSENT_VERSION)) return action();
    pendingAction.current = action;
    // Move focus off the page so keystrokes can't land behind the modal.
    (document.activeElement as HTMLElement | null)?.blur();
    setConsentOpen(true);
  }

  const onAccept = useCallback(() => {
    setConsentOpen(false);
    pendingAction.current?.();
    pendingAction.current = null;
  }, []);
  const onDismiss = useCallback(() => {
    setConsentOpen(false);
    pendingAction.current = null;
    textareaRef.current?.blur();
  }, []);

  function togglePill(p: string) {
    withConsent(() => setSelected((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p])));
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!selected.length && notes.trim().length < 3) {
      setError("Choose a symptom or tell Nauri a little about how you feel.");
      return;
    }
    withConsent(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/triage/guest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symptoms: selected, notes, consentVersion: CURRENT_CONSENT_VERSION }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Nauri couldn't respond just now. Please try again.");
        setResult(data as GuestTriageResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nauri couldn't respond just now. Please try again.");
      } finally {
        setLoading(false);
      }
    });
  }

  /** Stores the sealed triage for the post-login hand-over. */
  function persistPending(action: HandoverAction) {
    if (!result) return;
    savePendingTriage({
      symptoms: selected,
      triageOutcome: result.triageOutcome,
      recommendedSpecialty: result.triage.recommendedSpecialty,
      severity: result.triage.severity,
      clinicalSummary: result.triage.summary,
      claimToken: result.claimToken,
      expiresAt: result.claimExpiresAt,
      action,
    });
  }

  function handOver(action: HandoverAction) {
    if (!result) return;
    persistPending(action);
    const destination = `/dashboard/symptoms?action=${action}`;
    if (status === "authenticated" && session?.user?.role === "PATIENT") {
      router.push(destination);
    } else if (status === "authenticated") {
      setError("Referrals are for patient accounts. Please sign in with your patient account.");
    } else {
      router.push(`/signup?redirect=${encodeURIComponent("/dashboard/symptoms")}&action=${action}`);
    }
  }

  function reset() {
    setResult(null);
    setSelected([]);
    setNotes("");
    setError("");
  }

  return (
    <div id="nauri" className="scroll-mt-24 w-full rounded-3xl border border-white/60 bg-white text-left text-slate-900 shadow-xl">
      {/* Persona header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-600 text-lg font-extrabold text-white shadow-sm" aria-hidden>
          N
        </span>
        <div className="min-w-0">
          <p className="font-bold leading-tight text-nc-ink">Nauri</p>
          <p className="truncate text-xs text-slate-500">AI clinical health assistant · reproductive & maternal health</p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden /> Online
        </span>
      </div>

      <div className="p-5" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {!result ? (
            <motion.form key="ask" onSubmit={submit} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              <p className="rounded-2xl rounded-tl-sm bg-rose-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
                Hi, I&apos;m Nauri. Tell me what&apos;s going on and I&apos;ll help you understand how soon to get care, and
                who can help.
              </p>

              <div className="flex flex-wrap gap-2" role="group" aria-label="Common symptoms">
                {SYMPTOM_PILLS.map((p) => {
                  const on = selected.includes(p);
                  return (
                    <motion.button
                      key={p}
                      type="button"
                      {...tactile}
                      aria-pressed={on}
                      onClick={() => togglePill(p)}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                        on ? "border-nc-primary bg-nc-primary text-white" : "border-slate-200 bg-white text-slate-700 hover:border-nc-primary/40 hover:bg-nc-primary-container"
                      }`}
                    >
                      {on && <Check className="h-3.5 w-3.5" aria-hidden />}
                      {p}
                    </motion.button>
                  );
                })}
              </div>

              <div className="relative">
                <label htmlFor="nauri-notes" className="sr-only">Describe your symptoms</label>
                <textarea
                  id="nauri-notes"
                  ref={textareaRef}
                  rows={3}
                  maxLength={1000}
                  value={notes}
                  onFocus={() => withConsent(() => textareaRef.current?.focus())}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. My period is two weeks late and I have sharp pain on one side…"
                  className="m3-input resize-none pr-14 leading-relaxed"
                />
                <motion.button
                  type="submit"
                  {...tactile}
                  disabled={loading}
                  aria-label="Ask Nauri"
                  className="absolute bottom-2.5 right-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-nc-primary text-white shadow-sm hover:bg-nc-primary-hover disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
                </motion.button>
              </div>

              {loading && <p className="text-sm text-slate-500">Nauri is reviewing what you shared…</p>}
              {error && <Callout tone="danger" role="alert">{error}</Callout>}

              <p className="text-xs leading-relaxed text-slate-500">
                Not a diagnosis. In an emergency call SAMU Rwanda on <a href="tel:912" className="font-semibold text-nc-berry">{EMERGENCY_NUMBERS}</a>.
              </p>
            </motion.form>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip tone={SEVERITY_TONE[result.triage.severity]}>{result.triage.severity} severity</StatusChip>
                <span className="text-sm font-semibold text-nc-ink">{OUTCOME_COPY[result.triageOutcome].title}</span>
              </div>

              {result.triage.severity === "URGENT" && (
                <Callout tone="danger" icon={Siren} role="alert" title="This may need emergency care">
                  Call SAMU Rwanda on <a href="tel:912" className="font-bold underline">{EMERGENCY_NUMBERS}</a> or go to the nearest emergency department.
                </Callout>
              )}

              <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-nc-primary" aria-hidden />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Recommended specialty</p>
                  <p className="font-semibold text-nc-ink">{result.triage.recommendedSpecialty}</p>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-slate-700">{result.triage.summary}</p>
              <p className="text-xs text-slate-500">{OUTCOME_COPY[result.triageOutcome].body}</p>

              {result.triageOutcome !== "SELF_CARE" ? (
                <motion.button type="button" {...tactile} onClick={() => handOver("referral")} className="m3-btn-filled w-full py-3">
                  <Hospital className="h-4 w-4" aria-hidden /> Save Triage &amp; Book Specialist Referral
                </motion.button>
              ) : (
                <motion.button type="button" {...tactile} onClick={() => handOver("save")} className="m3-btn-filled w-full py-3">
                  Save to my health log <ArrowRight className="h-4 w-4" aria-hidden />
                </motion.button>
              )}

              {error && <Callout tone="danger" role="alert">{error}</Callout>}

              <div className="flex items-center justify-between text-xs text-slate-500">
                <button type="button" onClick={reset} className="inline-flex items-center gap-1 font-medium hover:text-nc-primary">
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Start over
                </button>
                {status !== "authenticated" && (
                  <span>
                    Have an account?{" "}
                    <Link
                      href={`/login?redirect=${encodeURIComponent("/dashboard/symptoms")}&action=${result.triageOutcome === "SELF_CARE" ? "save" : "referral"}`}
                      onClick={() => persistPending(result.triageOutcome === "SELF_CARE" ? "save" : "referral")}
                      className="font-semibold text-nc-primary hover:underline"
                    >
                      Log in
                    </Link>
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <GuestConsentModal open={consentOpen} onAccept={onAccept} onDismiss={onDismiss} />
    </div>
  );
}
