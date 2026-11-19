"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useAnimate, useReducedMotion } from "framer-motion";
import { HeartHandshake, Loader2, LockKeyhole, Siren, Sparkles } from "lucide-react";
import { ConsentToggle } from "./ConsentToggle";
import { SPRING, riseIn, stagger, tactile } from "./motion";

const CalmAnimation = dynamic(() => import("./CalmAnimation"), {
  ssr: false,
  loading: () => <div className="h-full w-full rounded-full bg-[#FDE2E4]/60" aria-hidden />,
});

const REASSURANCES = [
  {
    icon: LockKeyhole,
    tint: "bg-blue-50 text-[#1D4ED8]",
    title: "What you share stays yours",
    body: "Your symptoms are encrypted and only seen by you and the clinicians you choose. We never sell your data.",
  },
  {
    icon: Sparkles,
    tint: "bg-amber-50 text-[#D97706]",
    title: "A gentle guide, not a doctor",
    body: "Our AI suggests how soon to seek care and who can help. It cannot diagnose or examine you.",
  },
  {
    icon: Siren,
    tint: "bg-rose-50 text-[#BE123C]",
    title: "In an emergency, call 112 / 912",
    body: "Heavy bleeding with dizziness, severe pain or trouble breathing? Call SAMU Rwanda now. Please don't wait for the app.",
  },
];

export function TriageGate({ firstName, version }: { firstName: string; version: string }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [scope, animate] = useAnimate();
  const [privacy, setPrivacy] = useState(false);
  const [triage, setTriage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const ready = privacy && triage;

  // Once the vector animation has painted, give its pill a soft spring "breath in".
  function handleAnimationReady() {
    if (reduceMotion || !scope.current) return;
    // Springs take two keyframes; low damping supplies the overshoot-and-settle.
    animate(scope.current, { scale: [0.94, 1] }, { type: "spring", stiffness: 300, damping: 9 });
  }

  async function grant() {
    if (!ready || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privacy, triage, version }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "We couldn't save your consent. Please try again.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't save your consent. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="font-friendly relative isolate overflow-hidden rounded-[2.5rem] bg-[#FFFDF9] px-5 py-10 sm:px-10 sm:py-14">
      {/* Soft organic blush shapes, solid colours only, no gradients */}
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-[#FDF2F0]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 -z-10 h-80 w-80 rounded-full bg-[#FDF2F0]" />

      <motion.div
        variants={stagger}
        initial={reduceMotion ? false : "hidden"}
        animate="show"
        className="mx-auto max-w-2xl"
      >
        <motion.div variants={riseIn} className="flex justify-center">
          <div
            ref={scope}
            className="h-40 w-40 rounded-full border border-[#FFE4E6] bg-white p-4 shadow-sm sm:h-48 sm:w-48"
          >
            <CalmAnimation onReady={handleAnimationReady} />
          </div>
        </motion.div>

        <motion.header variants={riseIn} className="mt-8 text-center">
          <p className="text-sm font-semibold tracking-wide text-[#BE123C]">Symptom guide</p>
          <h1 className="mt-2 text-3xl font-bold leading-snug tracking-tight text-[#0F172A] sm:text-4xl">
            Hi {firstName}, let&apos;s take a breath together
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-[#475569]">
            Whatever you&apos;re feeling, you&apos;re not alone. Before we look at your symptoms, here is how we care for
            what you tell us.
          </p>
        </motion.header>

        <motion.ul variants={stagger} className="mt-10 grid gap-4 sm:grid-cols-3">
          {REASSURANCES.map(({ icon: Icon, tint, title, body }) => (
            <motion.li
              key={title}
              variants={riseIn}
              className="rounded-3xl border border-[#FFE4E6] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-full ${tint}`}>
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="mt-4 font-semibold leading-snug text-[#0F172A]">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[#475569]">{body}</p>
            </motion.li>
          ))}
        </motion.ul>

        <motion.section
          variants={riseIn}
          aria-labelledby="consent-heading"
          className="mt-10 rounded-3xl border border-[#FFE4E6] bg-white p-5 shadow-sm sm:p-8"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-[#BE123C]">
              <HeartHandshake className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 id="consent-heading" className="text-xl font-bold text-[#0F172A]">Your consent</h2>
              <p className="text-sm text-[#475569]">Required by Rwanda&apos;s data protection law (Nº 058/2021)</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <ConsentToggle checked={privacy} onChange={setPrivacy} title="I agree to the processing of my health data">
              NauriCare may process sensitive health data I enter here, such as symptoms, cycle details and notes, to give
              me triage guidance and keep it in my health record, as set out in the{" "}
              <Link href="/privacy" target="_blank" className="font-medium text-[#1D4ED8] underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </ConsentToggle>
            <ConsentToggle checked={triage} onChange={setTriage} title="I understand how AI triage works">
              AI triage is not a diagnosis and can be wrong. My symptom text, without my name or contact details, is sent
              to Google&apos;s MedGemma or Gemini models, which may process it outside Rwanda. See the{" "}
              <Link href="/consent" target="_blank" className="font-medium text-[#1D4ED8] underline underline-offset-2">
                Informed Consent
              </Link>
              .
            </ConsentToggle>
          </div>

          <p className="mt-5 text-sm leading-relaxed text-[#475569]">
            You can withdraw your consent at any time from the symptom guide. Withdrawing never affects your other care
            on NauriCare.
          </p>

          {error && (
            <p role="alert" className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-[#BE123C]">
              {error}
            </p>
          )}

          <div className="mt-7 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
            <motion.div {...tactile} className="sm:w-auto">
              <Link
                href="/dashboard"
                className="flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-[#475569] transition-colors hover:bg-[#FDF2F0] hover:text-[#0F172A]"
              >
                Not now
              </Link>
            </motion.div>
            <motion.button
              type="button"
              onClick={grant}
              disabled={!ready || busy}
              {...(ready && !busy ? tactile : { transition: SPRING })}
              className="flex items-center justify-center gap-2 rounded-full bg-[#1D4ED8] px-8 py-3 text-sm font-semibold text-white shadow-sm transition-[background-color,box-shadow,opacity] hover:bg-[#1E40AF] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Agree and start
            </motion.button>
          </div>
        </motion.section>

        <motion.p variants={riseIn} className="mt-6 text-center text-xs text-[#475569]">
          Consent notice version {version}
        </motion.p>
      </motion.div>
    </div>
  );
}
