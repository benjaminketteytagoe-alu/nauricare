"use client";

import { useState } from "react";
import Link from "next/link";
import { Turnstile } from "@marsidev/react-turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
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
    <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="bg-teal-50 p-4 rounded-full">
                  <CheckCircle className="w-8 h-8 text-teal-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                If an account exists for <span className="font-medium text-gray-700">{email}</span>, we&apos;ve sent a password reset link. Check your inbox and spam folder.
              </p>
              <p className="text-xs text-gray-400">The link expires in 1 hour.</p>
              <Link href="/login" className="inline-flex items-center gap-2 text-sm text-teal-600 hover:underline font-medium mt-4">
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <div className="flex justify-center mb-4">
                  <div className="bg-teal-50 p-3 rounded-full">
                    <Mail className="w-6 h-6 text-teal-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Forgot your password?</h2>
                <p className="text-gray-500 text-sm">
                  Enter your email and we&apos;ll send you a secure reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-200">
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
                    className="h-11 focus-visible:ring-teal-600"
                  />
                </div>

                <Turnstile
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                  onSuccess={setTurnstileToken}
                  onExpire={() => setTurnstileToken("")}
                  onError={() => setTurnstileToken("")}
                />

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {loading ? "Sending…" : "Send Reset Link"}
                </Button>
              </form>

              <p className="text-center">
                <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-600 transition-colors">
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
