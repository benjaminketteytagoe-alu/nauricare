import { Mail, MapPin, Siren } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SITE_LOCATION, SUPPORT_EMAIL } from "@/lib/site";

interface FooterLink {
  href: string;
  label: string;
}

// Signed-out visitors who follow a portal link are sent to log in first and
// returned afterwards, so these targets work for every audience.
const PLATFORM_LINKS: FooterLink[] = [
  { href: "/", label: "Home" },
  { href: "/waitlist", label: "Join the Waitlist" },
  { href: "/#symptom-guide", label: "AI Symptom Guide" },
  { href: "/dashboard/referrals", label: "Hospital Referrals" },
  { href: "/dashboard/providers", label: "Telehealth" },
  { href: "/dashboard/articles", label: "Educational Hub" },
];

const LEGAL_LINKS: FooterLink[] = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/consent", label: "Informed Consent" },
  { href: "/privacy#framework", label: "Law Nº 058/2021 Compliance" },
];

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <ul className="mt-4 space-y-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-ink-soft transition-colors hover:text-brand-ink">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-hairline bg-surface pb-safe-bottom">
      <div className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-12">
          {/* 1 · Brand, mission, emergency */}
          <div>
            <Link href="/" className="inline-block" aria-label="NauriCare home">
              <Image src="/logo-horizontal.jpg" alt="NauriCare" width={150} height={40} className="h-9 w-auto" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
              Empowering women&apos;s healthcare through clinical AI triage, verified hospital referrals, and private
              electronic health records.
            </p>
            <div role="note" className="mt-5 max-w-xs rounded-2xl bg-danger px-4 py-3 text-white shadow-sm">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Siren className="h-4 w-4" aria-hidden /> Medical emergency?
              </p>
              <p className="mt-1 text-sm leading-relaxed">
                Call SAMU Rwanda:{" "}
                <a href="tel:112" className="font-bold underline underline-offset-2">
                  112
                </a>{" "}
                /{" "}
                <a href="tel:912" className="font-bold underline underline-offset-2">
                  912
                </a>
              </p>
            </div>
          </div>

          {/* 2 · Platform */}
          <FooterColumn title="Platform" links={PLATFORM_LINKS} />

          {/* 3 · Legal & compliance */}
          <FooterColumn title="Legal & Compliance" links={LEGAL_LINKS} />

          {/* 4 · Contact & support */}
          <div>
            <h2 className="text-sm font-semibold text-ink">Contact & Support</h2>
            <ul className="mt-4 space-y-3 text-sm text-ink-soft">
              <li>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="inline-flex items-center gap-2 transition-colors hover:text-brand-ink"
                >
                  <Mail className="h-4 w-4 shrink-0 text-brand-ink" aria-hidden /> {SUPPORT_EMAIL}
                </a>
              </li>
              <li className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-brand-ink" aria-hidden /> {SITE_LOCATION}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-hairline py-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} NauriCare. Built for women in Africa.</p>
          <p>Information on NauriCare does not replace a consultation with a qualified clinician.</p>
        </div>
      </div>
    </footer>
  );
}
