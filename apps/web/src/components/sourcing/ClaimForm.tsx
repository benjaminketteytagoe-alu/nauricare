"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { Callout } from "@/components/ui/callout";
import { PASSWORD_REGEX } from "@/lib/validation/password";
import { SUPPORT_EMAIL } from "@/lib/site";

interface Invitation {
  fullName: string;
  specialty: string;
  facilityName: string | null;
  practiceLocation: string | null;
  yearsExperience: number | null;
  email: string;
  alreadyListed: boolean;
  sourceUrl: string;
}

export function ClaimForm({ token, invitation }: { token: string; invitation: Invitation }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [licence, setLicence] = useState("");
  const [terms, setTerms] = useState(false);
  const [listing, setListing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8 || !PASSWORD_REGEX.test(password)) return setError("Use at least 8 characters, including a number and a special character.");
    if (password !== confirm) return setError("The passwords don't match.");
    if (!terms || !listing) return setError("Please confirm both agreements to continue.");
    setBusy(true);
    try {
      const res = await fetch(`/api/providers/claim/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, licenseNumber: licence, acceptTerms: terms, consentToListing: listing }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="m3-card p-8 text-center" role="status">
        <CheckCircle2 className="mx-auto h-12 w-12 text-nc-primary" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold text-nc-ink">Welcome to NauriCare</h1>
        <p className="mt-2 text-slate-600">Your specialist account is ready. Patients can now find and book you.</p>
        <Link href="/login" className="m3-btn-filled mt-6">Log in to your clinical portal</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-nc-ink sm:text-3xl">
          {invitation.alreadyListed ? "Set up your NauriCare account" : "Join NauriCare as a women's health specialist"}
        </h1>
        <p className="mt-2 text-slate-600">
          {invitation.alreadyListed
            ? "Your profile is already listed with your permission. Choose a password to manage it."
            : "Review the details we found on your public listing. Nothing is shown to patients until you accept."}
        </p>
      </header>

      <section className="m3-card p-5 sm:p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Your profile</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">Name</dt><dd className="font-semibold text-nc-ink">{invitation.fullName}</dd></div>
          <div><dt className="text-slate-500">Specialty</dt><dd className="font-semibold text-nc-ink">{invitation.specialty}</dd></div>
          {invitation.facilityName && <div><dt className="text-slate-500">Practice</dt><dd className="font-semibold text-nc-ink">{invitation.facilityName}</dd></div>}
          {invitation.practiceLocation && <div><dt className="text-slate-500">Location</dt><dd className="font-semibold text-nc-ink">{invitation.practiceLocation}</dd></div>}
          {invitation.yearsExperience != null && <div><dt className="text-slate-500">Experience</dt><dd className="font-semibold text-nc-ink">{invitation.yearsExperience} years</dd></div>}
          <div><dt className="text-slate-500">Account email</dt><dd className="font-semibold text-nc-ink">{invitation.email}</dd></div>
        </dl>
        <a href={invitation.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-nc-primary hover:underline">
          Where we found this <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
        <p className="mt-2 text-xs text-slate-500">Something wrong? You can edit your profile after signing in, or email {SUPPORT_EMAIL}.</p>
      </section>

      <form onSubmit={submit} className="m3-card space-y-4 p-5 sm:p-6">
        {error && <Callout tone="danger" role="alert">{error}</Callout>}
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-nc-ink">Medical licence number</span>
          <input value={licence} onChange={(e) => setLicence(e.target.value)} required maxLength={40} placeholder="e.g. RMDC/12345" className="m3-input" autoComplete="off" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-nc-ink">Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" className="m3-input" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-nc-ink">Confirm password</span>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" className="m3-input" />
          </label>
        </div>
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input type="checkbox" checked={listing} onChange={(e) => setListing(e.target.checked)} className="mt-0.5 h-4 w-4 accent-nc-primary" />
          <span>I agree that NauriCare may show my name, photo, specialty, practice and contact details to patients, who can book consultations and message me.</span>
        </label>
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 h-4 w-4 accent-nc-primary" />
          <span>I accept the <Link href="/terms" target="_blank" className="font-medium text-nc-primary underline">Terms of Service</Link> and <Link href="/privacy" target="_blank" className="font-medium text-nc-primary underline">Privacy Policy</Link>.</span>
        </label>
        <button type="submit" disabled={busy} className="m3-btn-filled w-full">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} {invitation.alreadyListed ? "Set up my account" : "Accept and join NauriCare"}
        </button>
      </form>
    </div>
  );
}
