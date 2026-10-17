import Image from "next/image";
import Link from "next/link";
import { Mail, Siren } from "lucide-react";
import { LEGAL_CONTACT_EMAIL } from "@/components/legal/LegalDocument";

const PLATFORM_LINKS = [
  { href: "/", label: "Home" },
  { href: "/signup", label: "Create a patient account" },
  { href: "/signup/provider", label: "Join as a provider" },
  { href: "/login", label: "Log in" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
  { href: "/consent", label: "Informed Consent" },
];

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-sm font-semibold text-nc-ink">{title}</h2>
      <ul className="mt-4 space-y-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-slate-600 transition-colors hover:text-nc-primary">
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
    <footer className="border-t border-nc-divider bg-white pb-safe-bottom">
      <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="inline-block" aria-label="NauriCare home">
              <Image src="/logo-horizontal.jpg" alt="NauriCare" width={150} height={40} className="h-9 w-auto" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-600">
              Specialist care for PCOS, fibroids and menstrual health, built for women in Rwanda and across Africa.
            </p>
            <a
              href={`mailto:${LEGAL_CONTACT_EMAIL}`}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-nc-primary hover:underline"
            >
              <Mail className="h-4 w-4" aria-hidden /> {LEGAL_CONTACT_EMAIL}
            </a>
          </div>

          <FooterColumn title="Platform" links={PLATFORM_LINKS} />
          <FooterColumn title="Legal" links={LEGAL_LINKS} />

          <div>
            <h2 className="text-sm font-semibold text-nc-ink">Emergency</h2>
            <div className="mt-4 rounded-xl border border-rose-200 bg-nc-berry-container p-4 text-nc-berry">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Siren className="h-4 w-4" aria-hidden /> NauriCare is not an emergency service
              </p>
              <p className="mt-2 text-sm leading-relaxed">
                For medical emergencies, immediately dial SAMU Rwanda:{" "}
                <a href="tel:112" className="font-bold underline underline-offset-2">112</a> /{" "}
                <a href="tel:912" className="font-bold underline underline-offset-2">912</a>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-nc-divider py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} NauriCare. Built for women in Africa.</p>
          <p>Information on NauriCare does not replace a consultation with a qualified clinician.</p>
        </div>
      </div>
    </footer>
  );
}
