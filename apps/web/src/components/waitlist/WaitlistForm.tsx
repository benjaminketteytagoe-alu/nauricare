"use client";

import { useState } from "react";
import Link from "next/link";
import { Turnstile } from "@marsidev/react-turnstile";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Callout } from "@/components/ui/callout";
import { useClientValue } from "@/lib/hooks/useClientValue";
import { WAITLIST_ROLES } from "@/lib/waitlist";
import type { WaitlistRole } from "@prisma/client";

// Where the visitor came from: ?utm_source=… if present, else the referrer host.
function readSource(): string {
  const utm = new URLSearchParams(window.location.search).get("utm_source");
  if (utm) return utm.slice(0, 100);
  try {
    return document.referrer ? new URL(document.referrer).hostname : "";
  } catch {
    return "";
  }
}

export function WaitlistForm() {
  const source = useClientValue(readSource, "");
  const [role, setRole] = useState<WaitlistRole>("PATIENT");
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!consent) return setError("Please agree to be contacted about NauriCare.");
    if (!turnstileToken) return setError("Please complete the security check.");

    const form = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          country: form.get("country"),
          interest: form.get("interest"),
          role,
          consent,
          source: source || undefined,
          turnstileToken,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setTurnstileToken(""); // tokens are single-use
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="m3-card p-8 text-center sm:p-10" role="status">
        <CheckCircle2 className="mx-auto h-12 w-12 text-nc-primary" aria-hidden />
        <h2 className="mt-4 text-2xl font-bold text-nc-ink">You&apos;re on the list</h2>
        <p className="mx-auto mt-2 max-w-sm text-slate-600">
          Thank you for joining. We&apos;ll email you as soon as NauriCare opens to new members.
        </p>
        <Link href="/" className="m3-btn-outlined mt-6">Back to NauriCare</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="m3-card space-y-5 p-6 sm:p-8">
      {error && <Callout tone="danger" role="alert">{error}</Callout>}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="wl-name" className="mb-1.5 block text-sm font-semibold text-nc-ink">Full name</label>
          <input id="wl-name" name="name" required minLength={2} maxLength={120} autoComplete="name" className="m3-input" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="wl-email" className="mb-1.5 block text-sm font-semibold text-nc-ink">Email</label>
          <input id="wl-email" name="email" type="email" required maxLength={254} autoComplete="email" className="m3-input" />
        </div>
        <div>
          <label htmlFor="wl-phone" className="mb-1.5 block text-sm font-semibold text-nc-ink">
            Phone <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input id="wl-phone" name="phone" type="tel" maxLength={30} autoComplete="tel" placeholder="+250 7XX XXX XXX" className="m3-input" />
        </div>
        <div>
          <label htmlFor="wl-country" className="mb-1.5 block text-sm font-semibold text-nc-ink">
            Country <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input id="wl-country" name="country" maxLength={80} autoComplete="country-name" placeholder="Rwanda" className="m3-input" />
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-nc-ink">Which best describes you?</legend>
        <div className="space-y-2">
          {WAITLIST_ROLES.map((r) => (
            <label
              key={r.value}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                role === r.value ? "border-nc-primary bg-nc-primary-container text-nc-ink" : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="role"
                value={r.value}
                checked={role === r.value}
                onChange={() => setRole(r.value)}
                className="h-4 w-4 accent-nc-primary"
              />
              {r.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="wl-interest" className="mb-1.5 block text-sm font-semibold text-nc-ink">
          What would help you most? <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <textarea
          id="wl-interest"
          name="interest"
          rows={3}
          maxLength={1000}
          placeholder="e.g. PCOS support, finding a gynaecologist, cycle tracking…"
          className="m3-input resize-none leading-relaxed"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-nc-primary"
        />
        <span>
          I agree that NauriCare may store these details and contact me about the launch, as described in the{" "}
          <Link href="/privacy" target="_blank" className="font-medium text-nc-primary underline underline-offset-2">Privacy Policy</Link>.
          I can ask to be removed at any time.
        </span>
      </label>

      <Turnstile
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
        onSuccess={setTurnstileToken}
        onExpire={() => setTurnstileToken("")}
        onError={() => setTurnstileToken("")}
      />

      <button type="submit" disabled={loading} className="m3-btn-filled w-full py-3">
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {loading ? "Joining…" : "Join the waitlist"}
      </button>
    </form>
  );
}
