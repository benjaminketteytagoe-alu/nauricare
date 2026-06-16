"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { AuthVisualPanel, type AuthVisualSlide } from "@/components/auth/AuthVisualPanel";
import { ShieldCheck, Stethoscope, Users } from "lucide-react";

// ─── Trust panel data ─────────────────────────────────────────────────────────

const TRUST_SLIDES: AuthVisualSlide[] = [
  {
    src: "https://res.cloudinary.com/dl2fjmhft/image/upload/f_auto,q_auto/vvvvv_ybkkyk",
    tag: "Secure Telehealth",
    caption: "Hold consultations and manage your schedule from one trusted workspace.",
  },
  {
    src: "https://res.cloudinary.com/dl2fjmhft/image/upload/vvvvv_1_kn3e6u",
    tag: "Verified Clinical Records",
    caption: "Document care securely, with full audit trails built in.",
  },
];

const TRUST_CHIPS = [
  { Icon: ShieldCheck, label: "Licensed Verification" },
  { Icon: Stethoscope, label: "Built for Clinicians" },
  { Icon: Users,       label: "Pan-African Network" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProviderSignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const name           = formData.get("name") as string;
    const email          = formData.get("email") as string;
    const password       = formData.get("password") as string;
    const dateOfBirth    = formData.get("dateOfBirth") as string;
    const specialty      = formData.get("specialty") as string;
    const clinicName     = formData.get("clinicName") as string;
    const location       = formData.get("location") as string;
    const privacyConsent = formData.get("privacyConsent") === "on";

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email, password, name, dateOfBirth, privacyConsent,
          role: "PROVIDER", specialty, clinicName, location,
        }),
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
            <h2 className="text-3xl font-extrabold text-teal-900">Join as a Provider</h2>
            <p className="text-gray-500 mt-2 text-sm">Register your clinical practice on NauriCare.</p>
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
                placeholder="Dr. Jane Doe"
                className="h-11 focus-visible:ring-teal-500 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email" name="email" type="email" required
                placeholder="jane@clinic.com"
                className="h-11 focus-visible:ring-teal-500 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password" name="password" required minLength={8}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="specialty">Specialty</Label>
                <Input
                  id="specialty" name="specialty" required
                  placeholder="Gynecologist"
                  className="h-11 focus-visible:ring-teal-500 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clinicName">Clinic Name</Label>
                <Input
                  id="clinicName" name="clinicName" required
                  placeholder="NauriCare Clinic"
                  className="h-11 focus-visible:ring-teal-500 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location">Practice Location</Label>
              <Input
                id="location" name="location" required
                placeholder="Kigali, Rwanda"
                className="h-11 focus-visible:ring-teal-500 rounded-xl"
              />
            </div>

            <div className="flex items-start gap-3 py-1">
              <input
                type="checkbox" id="privacyConsent" name="privacyConsent" required
                className="mt-1 w-4 h-4 accent-teal-600 cursor-pointer shrink-0"
              />
              <Label htmlFor="privacyConsent" className="text-xs text-gray-600 font-normal leading-relaxed cursor-pointer">
                I consent to the collection and processing of my professional information in
                accordance with the{" "}
                <Link href="/privacy" className="text-teal-600 hover:underline">
                  Privacy Policy.
                </Link>{" "}
                I confirm the details above are accurate and verifiable.
              </Label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
            >
              {loading ? "Submitting application…" : "Register as Provider"}
            </Button>

            <p className="text-xs text-center text-gray-400">
              Your account will be reviewed and verified by our compliance team before activation.
            </p>
          </form>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-teal-600 hover:underline font-semibold">
              Log in
            </Link>
          </p>
          <p className="text-center text-sm text-gray-500">
            Registering as a patient?{" "}
            <Link href="/signup" className="text-teal-600 hover:underline font-semibold">
              Sign up here
            </Link>
          </p>
        </div>
      </div>

      {/* ── RIGHT — Sticky visual trust panel (desktop only) ── */}
      <AuthVisualPanel
        slides={TRUST_SLIDES}
        quote="Join a network transforming women's healthcare."
        chips={TRUST_CHIPS}
        intervalMs={5000}
      />
    </div>
  );
}
