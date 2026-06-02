"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Users, Activity } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const dateOfBirth = formData.get("dateOfBirth") as string;
    const privacyConsent = formData.get("privacyConsent") === "on";

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Hardcode role to PATIENT for all public signups
        body: JSON.stringify({ email, password, name, dateOfBirth, privacyConsent, role: "PATIENT" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register");
      
      router.push("/login?registered=true");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[90vh] flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md space-y-6 my-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-teal-900">Join NauriCare</h2>
            <p className="text-gray-500 mt-2">Create a patient account to track your health.</p>
          </div>

          <GoogleSignInButton text="Sign up with Google" />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or register with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">{error}</div>}
            
            <div className="space-y-1">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" required placeholder="Jane Doe" className="h-11 focus-visible:ring-teal-600" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="jane@example.com" className="h-11 focus-visible:ring-teal-600" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required minLength={8} className="h-11 focus-visible:ring-teal-600" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input id="dateOfBirth" name="dateOfBirth" type="date" required className="h-11 focus-visible:ring-teal-600 text-gray-700" />
              </div>
            </div>

            <div className="flex items-start gap-3 pt-2 pb-2">
              <input type="checkbox" id="privacyConsent" name="privacyConsent" required className="mt-1 w-4 h-4 accent-teal-600 cursor-pointer shrink-0" />
              <Label htmlFor="privacyConsent" className="text-xs text-gray-600 font-normal leading-relaxed cursor-pointer">
                I consent to the collection and processing of my personal health information in accordance with the Privacy Policy. I confirm I am of legal age to provide this consent.
              </Label>
            </div>

            <Button type="submit" className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-600">
            Already have an account? <Link href="/login" className="text-teal-600 hover:underline font-semibold">Log in</Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-teal-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-teal-400 via-teal-900 to-teal-900"></div>
        <div className="relative z-10 space-y-8 mt-10">
          <h3 className="text-3xl font-bold">Secure, Private, and Yours.</h3>
          <p className="text-teal-100">Empowering women across Africa with actionable health insights.</p>
        </div>
      </div>
    </div>
  );
}
