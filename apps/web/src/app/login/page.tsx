"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { ShieldCheck, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signOut, getSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { AuthVisualPanel, type AuthVisualSlide } from "@/components/auth/AuthVisualPanel";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postAuthDestination, useAuthParams } from "@/lib/authDestination";
import { SESSION_END_MESSAGE, type SessionEnd } from "@/lib/sessionPolicy";
import { useTurnstileSize } from "@/lib/useTurnstileSize";

// ─── Trust panel data ─────────────────────────────────────────────────────────

const TRUST_SLIDES: AuthVisualSlide[] = [
  {
    src: "https://res.cloudinary.com/dl2fjmhft/image/upload/f_auto,q_auto/vvvvv_ybkkyk",
    tag: "Secure Telehealth",
    caption: "Access your appointments and care team in one secure place.",
  },
  {
    src: "https://res.cloudinary.com/dl2fjmhft/image/upload/vvvvv_1_kn3e6u",
    tag: "Your Health Records",
    caption: "Pick up right where you left off — your full health timeline awaits.",
  },
];

const TRUST_CHIPS = [
  { Icon: ShieldCheck, label: "Law Nº 058/2021 Aligned" },
  { Icon: Lock, label: "End-to-End Encrypted" },
];

export default function LoginPage() {
  const router = useRouter();
  const authParams = useAuthParams(); // keeps ?redirect=&action= when switching auth pages
  const turnstileSize = useTurnstileSize();
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");
  // ?ended=idle|expired|revoked: say why, and clear the dead session cookie.
  const [endedMsg] = useState(() => {
    if (typeof window === "undefined") return "";
    const reason = new URLSearchParams(window.location.search).get("ended");
    return reason && reason in SESSION_END_MESSAGE ? SESSION_END_MESSAGE[reason as SessionEnd] : "";
  });
  useEffect(() => {
    if (endedMsg) void signOut({ redirect: false });
  }, [endedMsg]);
  const [successMsg, setSuccessMsg] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = window.location.search;
    if (params.includes("registered=true"))
      return "Account created. Log in to continue; we'll email you a sign-in code.";
    return "";
  });

  // --- MAGIC LINK STATE ---
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicTurnstileToken, setMagicTurnstileToken] = useState("");
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicError, setMagicError] = useState("");

  async function handleMagicLinkSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    setMagicLoading(true);
    setMagicError("");

    if (!magicTurnstileToken) {
      setMagicError("Please complete the security check before continuing.");
      setMagicLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken: magicTurnstileToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send login link.");
      setMagicLinkSent(true);
    } catch (err) {
      setMagicError(err instanceof Error ? err.message : "Failed to send login link.");
    } finally {
      setMagicLoading(false);
    }
  }

  async function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    if (!turnstileToken) {
      setError("Please complete the security check before logging in.");
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        turnstileToken,
      });

      if (res?.error) {
        setError(res.error || "Invalid email or password");
        setLoading(false);
      } else {
        // Fetch the newly created session to check the user's role
        const session = await getSession();
        const role = session?.user?.role;

        // Second step: the emailed sign-in code. Afterwards the user goes to
        // their portal (honouring a safe ?redirect= / pending triage hand-over).
        router.push(`/verify-code?next=${encodeURIComponent(postAuthDestination(role))}`);
      }
    } catch {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-8 py-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-ink">Welcome Back</h2>
            <p className="text-gray-500 mt-2">Log in to your NauriCare account.</p>
          </div>

          <GoogleSignInButton text="Log in with Google" />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or log in with email</span>
            </div>
          </div>

          {!useMagicLink ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-danger-soft text-danger p-3 rounded-md text-sm border border-danger-line">
                  {error}
                </div>
              )}
              {endedMsg && (
                <div
                  role="status"
                  className="bg-warning-soft text-warning p-3 rounded-md text-sm border border-warning-line"
                >
                  {endedMsg}
                </div>
              )}
              {successMsg && (
                <div className="bg-brand-soft text-brand-ink p-3 rounded-md text-sm border border-brand-line font-medium">
                  {successMsg}
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required placeholder="jane@example.com" className="h-11" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-xs text-brand-ink hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <PasswordInput id="password" name="password" required className="h-11" />
              </div>

              <Turnstile
                key={turnstileSize}
                options={{ size: turnstileSize }}
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                onSuccess={setTurnstileToken}
                onExpire={() => setTurnstileToken("")}
                onError={() => setTurnstileToken("")}
              />

              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? "Logging in..." : "Log In"}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setUseMagicLink(true);
                  setError("");
                  setSuccessMsg("");
                }}
                className="w-full text-center text-sm text-brand-ink hover:underline font-medium"
              >
                Email me a login link instead
              </button>
            </form>
          ) : magicLinkSent ? (
            <div className="bg-brand-soft text-brand-ink p-4 rounded-xl text-sm border border-brand-line text-center space-y-1">
              <p className="font-semibold">Check your inbox!</p>
              <p>We&apos;ve sent a secure login link to your email. You can close this window.</p>
            </div>
          ) : (
            <form onSubmit={handleMagicLinkSubmit} className="space-y-5">
              {magicError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">{magicError}</div>
              )}

              <div className="space-y-1">
                <Label htmlFor="magic-email">Email</Label>
                <Input
                  id="magic-email"
                  name="email"
                  type="email"
                  required
                  placeholder="jane@example.com"
                  className="h-11"
                />
              </div>

              <Turnstile
                key={turnstileSize}
                options={{ size: turnstileSize }}
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                onSuccess={setMagicTurnstileToken}
                onExpire={() => setMagicTurnstileToken("")}
                onError={() => setMagicTurnstileToken("")}
              />

              <Button type="submit" className="w-full h-11" disabled={magicLoading}>
                {magicLoading ? "Sending..." : "Send Login Link"}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setUseMagicLink(false);
                  setMagicError("");
                }}
                className="w-full text-center text-sm text-brand-ink hover:underline font-medium"
              >
                Use my password instead
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <Link href={`/signup${authParams}`} className="text-brand-ink hover:underline font-semibold">
              Sign up
            </Link>
          </p>
          <p className="text-center text-sm text-gray-600">
            Are you a provider?{" "}
            <Link href="/signup/provider" className="text-brand-ink hover:underline font-semibold">
              Register your practice
            </Link>
          </p>
        </div>
      </div>

      <AuthVisualPanel
        slides={TRUST_SLIDES}
        quote="Secure, private, and yours."
        chips={TRUST_CHIPS}
        intervalMs={5000}
      />
    </div>
  );
}
