"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Turnstile } from "@marsidev/react-turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { AuthVisualPanel, type AuthVisualSlide } from "@/components/auth/AuthVisualPanel";
import { passwordField } from "@/lib/validation/password";
import { COUNTRIES, PRIORITY_COUNTRY_COUNT, dialCodeForCountry } from "@/lib/countries";
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
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [password, setPassword]         = useState("");
  const [selectedCountry, setSelectedCountry] = useState("Rwanda");
  const [localPhone, setLocalPhone]     = useState("");

  const dialCode = dialCodeForCountry(selectedCountry);

  const passwordResult = password ? passwordField.safeParse(password) : null;
  const passwordError  = passwordResult && !passwordResult.success
    ? passwordResult.error.issues[0].message
    : "";

  async function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!turnstileToken) {
      setError("Please complete the security check before registering.");
      setLoading(false);
      return;
    }

    const passwordCheck = passwordField.safeParse(password);
    if (!passwordCheck.success) {
      setError(passwordCheck.error.issues[0].message);
      setLoading(false);
      return;
    }

    if (!localPhone.trim()) {
      setError("Please enter your phone number.");
      setLoading(false);
      return;
    }

    const formData    = new FormData(e.currentTarget);
    const name           = formData.get("name") as string;
    const email          = formData.get("email") as string;
    const dateOfBirth    = formData.get("dateOfBirth") as string;
    const specialty      = formData.get("specialty") as string;
    const clinicName     = formData.get("clinicName") as string;
    const location       = formData.get("location") as string;
    const privacyConsent = formData.get("privacyConsent") === "on";

    // Combine dial code + local digits → E.164 format
    const phoneNumber = dialCode + localPhone.replace(/\D/g, "");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email, password, name, dateOfBirth, privacyConsent,
          role: "PROVIDER", specialty, clinicName, location, turnstileToken,
          country: selectedCountry,
          phoneNumber,
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
    <div className="min-h-[100dvh] flex">

      {/* ── LEFT — Registration form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-8 py-6 sm:py-8 bg-white overflow-y-auto">
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

            {/* Country select */}
            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <select
                id="country"
                required
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  setLocalPhone("");
                }}
                className="w-full h-11 px-3 border border-input rounded-xl text-sm bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 text-gray-900"
              >
                <optgroup label="Recommended regions">
                  {COUNTRIES.slice(0, PRIORITY_COUNTRY_COUNT).map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </optgroup>
                <optgroup label="All countries">
                  {COUNTRIES.slice(PRIORITY_COUNTRY_COUNT).map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Phone number — dial code prefix + local number */}
            <div className="space-y-1.5">
              <Label htmlFor="localPhone">Phone Number</Label>
              <div className="flex h-11 rounded-xl border border-input overflow-hidden focus-within:ring-2 focus-within:ring-teal-500 focus-within:ring-offset-0">
                <span className="inline-flex items-center px-3 bg-gray-50 border-r border-input text-sm font-semibold text-gray-700 whitespace-nowrap select-none shrink-0">
                  {dialCode || "—"}
                </span>
                <input
                  id="localPhone"
                  type="tel"
                  required
                  placeholder="788 123 456"
                  value={localPhone}
                  onChange={(e) => setLocalPhone(e.target.value)}
                  className="flex-1 min-w-0 px-3 text-sm bg-white outline-none placeholder:text-gray-400"
                />
              </div>
              <p className="text-xs text-gray-400">
                Enter your local number — the country code ({dialCode}) is added automatically.
              </p>
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
