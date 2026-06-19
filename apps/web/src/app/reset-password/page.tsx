"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { CheckCircle, ShieldAlert } from "lucide-react";

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
          <div className="bg-red-50 p-4 rounded-full">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Invalid Reset Link</h2>
        <p className="text-gray-500 text-sm">This password reset link is missing a token. Please request a new reset link.</p>
        <Link href="/forgot-password" className="text-sm text-teal-600 hover:underline font-medium">
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
          <div className="bg-teal-50 p-4 rounded-full">
            <CheckCircle className="w-8 h-8 text-teal-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Password updated</h2>
        <p className="text-gray-500 text-sm">Your password has been changed successfully. Redirecting to login…</p>
      </div>
    );
  }

  return (
    <>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Set new password</h2>
        <p className="text-gray-500 text-sm">
          Must be at least 8 characters and include a number and special character.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-200">
            {error}
          </div>
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
            className="h-11 focus-visible:ring-teal-600"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white"
        >
          {loading ? "Updating password…" : "Update Password"}
        </Button>
      </form>

      <p className="text-center">
        <Link href="/login" className="text-sm text-gray-500 hover:text-teal-600 transition-colors">
          Back to login
        </Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
          <Suspense fallback={<div className="text-center text-gray-400">Loading…</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
