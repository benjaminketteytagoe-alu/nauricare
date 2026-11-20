"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTurnstileSize } from "@/lib/useTurnstileSize";

export default function ForgotPasswordPage() {
  const turnstileSize = useTurnstileSize();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!turnstileToken) {
      setError("Please complete the security check before submitting.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Request failed");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-surface-muted px-4">
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-2xl shadow-sm border border-hairline p-5 sm:p-8 space-y-6">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="bg-brand-soft p-4 rounded-full">
                  <CheckCircle className="w-8 h-8 text-brand-ink" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-ink">Check your email</h2>
              <p className="text-ink-muted text-sm leading-relaxed">
                If an account exists for <span className="font-medium text-ink-soft">{email}</span>, we&apos;ve sent a
                password reset link. Check your inbox and spam folder.
              </p>
              <p className="text-xs text-ink-muted">The link expires in 1 hour.</p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-brand-ink hover:underline font-medium mt-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <div className="flex justify-center mb-4">
                  <div className="bg-brand-soft p-3 rounded-full">
                    <Mail className="w-6 h-6 text-brand-ink" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-ink">Forgot your password?</h2>
                <p className="text-ink-muted text-sm">Enter your email and we&apos;ll send you a secure reset link.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-danger-soft text-danger p-3 rounded-xl text-sm border border-danger-line">
                    {error}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="h-11"
                  />
                </div>

                <Turnstile
                  key={turnstileSize}
                  options={{ size: turnstileSize }}
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                  onSuccess={setTurnstileToken}
                  onExpire={() => setTurnstileToken("")}
                  onError={() => setTurnstileToken("")}
                />

                <Button type="submit" disabled={loading} className="w-full h-11">
                  {loading ? "Sending…" : "Send Reset Link"}
                </Button>
              </form>

              <p className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-brand-ink transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
