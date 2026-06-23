"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Turnstile } from "@marsidev/react-turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { AuthVisualPanel, type AuthVisualSlide } from "@/components/auth/AuthVisualPanel";
import { ShieldCheck, Lock } from "lucide-react";

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
  { Icon: ShieldCheck, label: "HIPAA Compliant" },
  { Icon: Lock,        label: "End-to-End Encrypted" },
];

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [successMsg, setSuccessMsg] = useState(() =>
    typeof window !== "undefined" && window.location.search.includes("registered=true")
      ? "Account created successfully! Please log in."
      : ""
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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

        // Route dynamically based on RBAC
        if (role === "PROVIDER") {
          router.push("/provider");
        } else if (role === "ADMIN") {
          router.push("/admin");
        } else {
          router.push("/dashboard"); // Default Patient route
        }
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
            <h2 className="text-3xl font-bold text-teal-900">Welcome Back</h2>
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

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">{error}</div>}
            {successMsg && <div className="bg-teal-50 text-teal-700 p-3 rounded-md text-sm border border-teal-200 font-medium">{successMsg}</div>}
            
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="jane@example.com" className="h-11 focus-visible:ring-teal-600" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-xs text-teal-600 hover:underline">Forgot password?</Link>
              </div>
              <PasswordInput id="password" name="password" required className="h-11 focus-visible:ring-teal-600" />
            </div>

            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
              onSuccess={setTurnstileToken}
              onExpire={() => setTurnstileToken("")}
              onError={() => setTurnstileToken("")}
            />

            <Button type="submit" className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white" disabled={loading}>
              {loading ? "Logging in..." : "Log In"}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-600">
            Don&apos;t have an account? <Link href="/signup" className="text-teal-600 hover:underline font-semibold">Sign up</Link>
          </p>
          <p className="text-center text-sm text-gray-600">
            Are you a provider? <Link href="/signup/provider" className="text-teal-600 hover:underline font-semibold">Register your practice</Link>
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
