import type { Metadata } from "next";
import LandingPageClient from "@/components/landing/LandingPageClient";

// Static metadata is resolved once at build time by the Server Component shell.
// All interactive, animated UI lives in LandingPageClient ("use client").
export const metadata: Metadata = {
  title: "NauriCare — Women's Health, Connected",
  description:
    "Compassionate, evidence-based care for PCOS, fibroids, and women's reproductive health. Connect with verified specialists, track your health journey, and access 24/7 AI-powered guidance.",
  openGraph: {
    title: "NauriCare — Women's Health, Connected",
    description: "Your body, understood. Your health, connected.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NauriCare — Women's Health, Connected",
    description: "Your body, understood. Your health, connected.",
  },
};

// The page itself is a lightweight Server Component — no client JS needed here.
// LandingPageClient handles everything that requires the browser.
export default function LandingPage() {
  return <LandingPageClient />;
}
