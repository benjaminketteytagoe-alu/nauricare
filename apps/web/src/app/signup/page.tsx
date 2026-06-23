"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Turnstile } from "@marsidev/react-turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { AuthVisualPanel, type AuthVisualSlide } from "@/components/auth/AuthVisualPanel";
import { passwordField } from "@/lib/validation/password";
import { ShieldCheck, Lock, Globe } from "lucide-react";

// ─── Trust panel data ─────────────────────────────────────────────────────────

const TRUST_SLIDES: AuthVisualSlide[] = [
  {
    src: "https://res.cloudinary.com/dl2fjmhft/image/upload/f_auto,q_auto/vvvvv_ybkkyk",
    tag: "Secure Telehealth",
    caption: "Connect face-to-face with verified specialists — securely, on your schedule.",
  },
  {
    src: "https://res.cloudinary.com/dl2fjmhft/image/upload/vvvvv_1_kn3e6u",
    tag: "Protected Health Records",
    caption: "Your complete health timeline, encrypted and always in your hands.",
  },
];

const TRUST_CHIPS = [
  { Icon: ShieldCheck, label: "HIPAA Compliant" },
  { Icon: Lock,        label: "End-to-End Encrypted" },
  { Icon: Globe,       label: "Built for Africa" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [password, setPassword] = useState("");

  const passwordResult = password ? passwordField.safeParse(password) : null;
  const passwordError = passwordResult && !passwordResult.success
    ? passwordResult.error.issues[0].message
    : "";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!turnstileToken) {
      setError("Please complete the security check before signing up.");
      setLoading(false);
      return;
    }

    const passwordCheck = passwordField.safeParse(password);
    if (!passwordCheck.success) {
      setError(passwordCheck.error.issues[0].message);
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const name           = formData.get("name") as string;
    const email          = formData.get("email") as string;
    const dateOfBirth    = formData.get("dateOfBirth") as string;
    const privacyConsent = formData.get("privacyConsent") === "on";

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, dateOfBirth, privacyConsent, role: "PATIENT", turnstileToken }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register");
      router.push("/login?registered=true");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex">

      {/* ── LEFT — Registration form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-8 py-6 sm:py-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md space-y-6 my-8">

          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-teal-900">Join NauriCare</h2>
            <p className="text-gray-500 mt-2 text-sm">Create your free patient account.</p>
          </div>

          <GoogleSignInButton text="Sign up with Google" />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-gray-400">Or register with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-200">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name" name="name" required
                placeholder="Jane Doe"
                className="h-11 focus-visible:ring-teal-500 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email" name="email" type="email" required
                placeholder="jane@example.com"
                className="h-11 focus-visible:ring-teal-500 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password" name="password" required minLength={8}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!passwordError}
                  className="h-11 focus-visible:ring-teal-500 rounded-xl"
                />
                {passwordError && (
                  <p className="text-xs text-red-600">{passwordError}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth" name="dateOfBirth" type="date" required
                  className="h-11 focus-visible:ring-teal-500 rounded-xl text-gray-700"
                />
              </div>
            </div>

            <div className="flex items-start gap-3 py-1">
              <input
                type="checkbox" id="privacyConsent" name="privacyConsent" required
                className="mt-1 w-4 h-4 accent-teal-600 cursor-pointer shrink-0"
              />
              <Label htmlFor="privacyConsent" className="text-xs text-gray-600 font-normal leading-relaxed cursor-pointer">
                I consent to the collection and processing of my personal health information in
                accordance with the{" "}
                <Link href="/privacy" className="text-teal-600 hover:underline">
                  Privacy Policy.
                </Link>{" "}
                I confirm I am of legal age to provide this consent.
              </Label>
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
              className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
            >
              {loading ? "Creating account…" : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-teal-600 hover:underline font-semibold">
              Log in
            </Link>
          </p>
          <p className="text-center text-sm text-gray-500">
            Registering as a provider?{" "}
            <Link href="/signup/provider" className="text-teal-600 hover:underline font-semibold">
              Sign up here
            </Link>
          </p>
        </div>
      </div>

      {/* ── RIGHT — Sticky visual trust panel (desktop only) ── */}
      <AuthVisualPanel
        slides={TRUST_SLIDES}
        quote="Join thousands of women taking control of their reproductive health."
        chips={TRUST_CHIPS}
        intervalMs={5000}
      />
    </div>
  );
}
