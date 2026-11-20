"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { useEffect, useId, useState } from "react";
import { Callout } from "@/components/ui/callout";
import { SUPPORT_EMAIL } from "@/lib/site";

/** Danger zone: GitHub-style account deletion (type your username to confirm). */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  return (
    <section
      id="delete-account"
      aria-labelledby="danger-heading"
      className="scroll-mt-24 rounded-2xl border border-danger-line bg-danger-soft/40 p-5"
    >
      <h3 id="danger-heading" className="font-bold text-danger">
        Delete account
      </h3>
      <p className="mt-1 text-sm text-ink-soft">Close your NauriCare account. This can&apos;t be undone.</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 rounded-full border border-danger-line bg-surface px-5 py-2 text-sm font-semibold text-danger hover:bg-danger hover:text-white"
      >
        Delete my account
      </button>
      {open && <DeleteAccountDialog onClose={() => setOpen(false)} />}
    </section>
  );
}

function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const [phrase, setPhrase] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/account")
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "Couldn't start account deletion.");
        setPhrase(d.phrase);
      })
      .catch((e: Error) => setError(e.message));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  const matches = !!phrase && typed.trim().toLowerCase() === phrase.toLowerCase();

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!matches) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: typed }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Couldn't delete your account.");
      await signOut({ callbackUrl: "/?account=deleted" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete your account.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-surface-inverse/60 sm:items-center sm:p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface shadow-xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-hairline p-5">
          <h2 id={titleId} className="flex items-center gap-2 text-lg font-bold text-ink">
            <AlertTriangle className="h-5 w-5 text-danger" aria-hidden /> Delete your account?
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="rounded-full p-2 text-ink-muted hover:bg-surface-muted"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <form onSubmit={confirm} className="space-y-4 p-5">
          <Callout tone="warning">
            This is permanent. You&apos;ll be signed out and won&apos;t be able to sign back in to this account.
          </Callout>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
            <li>Your name, email, phone number, avatar and sign-in methods are removed.</li>
            <li>Upcoming consultations are cancelled and hospital share links stop working.</li>
            <li>Your community posts stay, shown as &ldquo;Deleted user&rdquo;.</li>
            <li>
              Clinical records (consultations, prescriptions, referrals) are kept without your name, as healthcare
              providers must retain medical records. Questions?{" "}
              <a className="font-medium text-brand-ink underline" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
            </li>
          </ul>
          {error && (
            <Callout tone="danger" role="alert">
              {error}
            </Callout>
          )}
          <label className="block text-sm">
            <span className="mb-1.5 block text-ink-soft">
              To confirm, type{" "}
              <strong className="select-all break-all rounded bg-surface-muted px-1.5 py-0.5 font-mono text-ink">
                {phrase ?? "…"}
              </strong>{" "}
              below
            </span>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              disabled={!phrase || busy}
              className="m3-input font-mono"
              aria-label="Confirmation text"
            />
          </label>
          <button
            type="submit"
            disabled={!matches || busy}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-danger px-5 py-3 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{" "}
            {busy ? "Deleting…" : "I understand, delete my account"}
          </button>
        </form>
      </div>
    </div>
  );
}
