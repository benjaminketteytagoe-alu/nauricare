"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { ShieldCheck, Lock, Globe } from "lucide-react";

// ─── Trust panel data ─────────────────────────────────────────────────────────

const TRUST_SLIDES = [
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

  // Crossfade carousel state
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % TRUST_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const name           = formData.get("name") as string;
    const email          = formData.get("email") as string;
    const password       = formData.get("password") as string;
    const dateOfBirth    = formData.get("dateOfBirth") as string;
    const privacyConsent = formData.get("privacyConsent") === "on";

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, dateOfBirth, privacyConsent, role: "PATIENT" }),
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
    <div className="min-h-[90vh] flex">

      {/* ── LEFT — Registration form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-white overflow-y-auto">
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
                <Input
                  id="password" name="password" type="password" required minLength={8}
                  placeholder="Min. 8 characters"
                  className="h-11 focus-visible:ring-teal-500 rounded-xl"
                />
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
        </div>
      </div>

      {/* ── RIGHT — Sticky visual trust panel (desktop only) ── */}
      <div className="hidden lg:block lg:w-1/2 sticky top-0 h-[100vh] overflow-hidden bg-teal-950">

        {/* Crossfade image slides */}
        {TRUST_SLIDES.map((slide, i) => (
          <div
            key={slide.src}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{ opacity: i === activeIdx ? 1 : 0 }}
            aria-hidden={i !== activeIdx}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.src}
              alt={slide.tag}
              className="w-full h-full object-cover"
            />
          </div>
        ))}

        {/* Multi-layer gradient for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-teal-950 via-teal-950/60 to-teal-900/20 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-teal-950/30 pointer-events-none" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-10 pb-12 text-white">

          {/* Slide indicators */}
          <div className="flex items-center gap-2 mb-7">
            {TRUST_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                aria-label={`View slide ${i + 1}`}
                className={`rounded-full transition-all duration-500 ${
                  i === activeIdx
                    ? "w-7 h-2 bg-white"
                    : "w-2 h-2 bg-white/35 hover:bg-white/60"
                }`}
              />
            ))}
          </div>

          {/* Current slide caption */}
          <div className="mb-7 space-y-1 min-h-[52px]">
            <p className="text-xs font-extrabold tracking-[0.18em] uppercase text-teal-300 transition-opacity duration-500">
              {TRUST_SLIDES[activeIdx].tag}
            </p>
            <p className="text-sm text-white/70 leading-relaxed max-w-xs transition-opacity duration-500">
              {TRUST_SLIDES[activeIdx].caption}
            </p>
          </div>

          {/* Main trust headline */}
          <blockquote className="text-2xl md:text-3xl font-extrabold leading-tight mb-8 drop-shadow-lg">
            &ldquo;Join thousands of women taking control of their reproductive health.&rdquo;
          </blockquote>

          {/* Trust chips */}
          <div className="flex flex-wrap gap-2.5">
            {TRUST_CHIPS.map(({ Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-4 py-2 text-xs font-semibold text-white/90"
              >
                <Icon className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
