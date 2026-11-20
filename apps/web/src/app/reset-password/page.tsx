"use client";

import { CheckCircle, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="bg-danger-soft p-4 rounded-full">
            <ShieldAlert className="w-8 h-8 text-danger" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-ink">Invalid Reset Link</h2>
        <p className="text-ink-muted text-sm">
          This password reset link is missing a token. Please request a new reset link.
        </p>
        <Link href="/forgot-password" className="text-sm text-brand-ink hover:underline font-medium">
          Request new link
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="bg-brand-soft p-4 rounded-full">
            <CheckCircle className="w-8 h-8 text-brand-ink" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-ink">Password updated</h2>
        <p className="text-ink-muted text-sm">Your password has been changed successfully. Redirecting to login…</p>
      </div>
    );
  }

  return (
    <>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-ink">Set new password</h2>
        <p className="text-ink-muted text-sm">
          Must be at least 8 characters and include a number and special character.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-danger-soft text-danger p-3 rounded-xl text-sm border border-danger-line">{error}</div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="password">New Password</Label>
          <PasswordInput
            id="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters, 1 number, 1 special char"
            className="h-11"
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full h-11">
          {loading ? "Updating password…" : "Update Password"}
        </Button>
      </form>

      <p className="text-center">
        <Link href="/login" className="text-sm text-ink-muted hover:text-brand-ink transition-colors">
          Back to login
        </Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-surface-muted px-4">
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-2xl shadow-sm border border-hairline p-8 space-y-6">
          <Suspense fallback={<div className="text-center text-ink-muted">Loading…</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
