import type { Metadata } from "next";
import { HeartPulse, ShieldCheck, Stethoscope } from "lucide-react";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";

export const metadata: Metadata = {
  title: "Join the Waitlist",
  description:
    "Be among the first to access NauriCare: AI symptom guidance, verified specialists and hospital referrals for PCOS, fibroids and women's health in Rwanda.",
};

const PERKS = [
  { icon: Stethoscope, text: "Early access to verified women's health specialists" },
  { icon: HeartPulse, text: "Nauri, our AI symptom guide, for PCOS, fibroids and cycle health" },
  { icon: ShieldCheck, text: "Private by design, aligned with Rwanda's Law Nº 058/2021" },
];

export default function WaitlistPage() {
  return (
    <div className="bg-slate-50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:px-8 lg:py-20">
        <div className="lg:pt-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-nc-primary">Coming soon</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-nc-ink sm:text-4xl">Join the NauriCare waitlist</h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            We&apos;re opening NauriCare to women across Rwanda in stages. Add your name and we&apos;ll let you know as
            soon as there&apos;s a place for you.
          </p>
          <ul className="mt-8 space-y-4">
            {PERKS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-nc-primary-container text-nc-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="pt-1.5 text-slate-700">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <WaitlistForm />
      </div>
    </div>
  );
}
