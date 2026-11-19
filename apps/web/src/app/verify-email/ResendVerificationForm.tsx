"use client";

import { useState } from "react";

export function ResendVerificationForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to resend.");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="bg-brand-soft border border-brand-line rounded-xl px-5 py-4 text-sm text-brand-ink text-center">
        <p className="font-semibold">Check your inbox!</p>
        <p className="mt-1 text-brand-ink">
          If an unverified account with that email exists, a new verification link is on its way.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-lg">{error}</p>}
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email address"
        className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-focus text-gray-900 placeholder:text-ink-muted"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 bg-brand hover:bg-brand-hover disabled:opacity-50 text-on-brand text-sm font-semibold rounded-xl transition-colors"
      >
        {loading ? "Sending…" : "Resend Verification Email"}
      </button>
    </form>
  );
}
