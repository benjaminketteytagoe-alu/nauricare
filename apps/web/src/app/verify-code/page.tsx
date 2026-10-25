"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, signOut, useSession } from "next-auth/react";
import { Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { Callout } from "@/components/ui/callout";
import { ROLE_HOME_PATHS } from "@/lib/authDestination";

export default function VerifyCodePage() {
  return (
    <Suspense fallback={null}>
      <VerifyCode />
    </Suspense>
  );
}

/** Only follow `next` into the user's own portal. */
function destination(next: string | null, role?: string | null) {
  const home = ROLE_HOME_PATHS[role ?? "PATIENT"] ?? "/dashboard";
  if (next && next.startsWith("/") && !next.startsWith("//") && (next === home || next.startsWith(`${home}/`) || next.startsWith(`${home}?`))) return next;
  return home;
}

function VerifyCode() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const { data: session, status, update } = useSession();
  const [code, setCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const sentOnce = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function send() {
    setSending(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/auth/code/send", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "We couldn't send your code.");
      setMaskedEmail(d.maskedEmail);
      setInfo(sentOnce.current ? "A new code is on its way." : "");
      setCooldown(45);
      inputRef.current?.focus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't send your code.");
    } finally {
      sentOnce.current = true;
      setSending(false);
    }
  }

  // Already verified, or not signed in: leave this page. Otherwise send the first code.
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (status === "authenticated" && !session?.loginCodePending && session?.user?.id) router.replace(destination(next, session.user.role));
    else if (status === "authenticated" && session?.loginCodePending && !sentOnce.current) {
      sentOnce.current = true;
      void send();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run on session changes only
  }, [status, session?.loginCodePending]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function verify(value = code) {
    if (!/^\d{6}$/.test(value) || busy) return;
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/auth/code/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: value }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "That code didn't work.");
      await update({ loginCode: "verified" });
      const fresh = await getSession();
      if (!fresh?.user?.id) throw new Error("We couldn't finish signing you in. Please request a new code.");
      router.replace(destination(next, fresh.user.role));
    } catch (e) {
      setError(e instanceof Error ? e.message : "That code didn't work.");
      setCode("");
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
        <Link href="/" aria-label="NauriCare home" className="inline-block">
          <Image src="/logo-horizontal.jpg" alt="NauriCare" width={140} height={36} className="h-8 w-auto" priority />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-nc-ink"><ShieldCheck className="h-6 w-6 text-nc-primary" aria-hidden /> Check your email</h1>
          <p className="mt-2 text-sm text-slate-600">
            {maskedEmail ? <>We sent a 6-digit code to <strong className="text-nc-ink">{maskedEmail}</strong>. Enter it to continue.</> : sending ? "Sending your sign-in code…" : "Enter the 6-digit code we emailed you."}
          </p>
        </div>

        {error && <Callout tone="danger" role="alert">{error}</Callout>}
        {info && <Callout tone="success" role="status" icon={MailCheck}>{info}</Callout>}

        <form onSubmit={(e) => { e.preventDefault(); void verify(); }} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-nc-ink">Sign-in code</span>
            <input
              ref={inputRef}
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(v);
                if (v.length === 6) void verify(v);
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              autoFocus
              disabled={busy}
              aria-describedby="code-help"
              className="m3-input text-center font-mono text-3xl tracking-[0.5em]"
              placeholder="••••••"
            />
            <span id="code-help" className="mt-1.5 block text-xs text-slate-500">The code expires after 10 minutes. Never share it with anyone.</span>
          </label>
          <button type="submit" disabled={busy || code.length !== 6} className="m3-btn-filled w-full py-3">
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} {busy ? "Verifying…" : "Verify and continue"}
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <button type="button" onClick={() => void send()} disabled={sending || cooldown > 0} className="font-semibold text-nc-primary hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline">
            {cooldown > 0 ? `Resend code in ${cooldown}s` : sending ? "Sending…" : "Resend code"}
          </button>
          <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="text-slate-500 hover:text-slate-800 hover:underline">
            Use a different account
          </button>
        </div>
      </div>
    </main>
  );
}
