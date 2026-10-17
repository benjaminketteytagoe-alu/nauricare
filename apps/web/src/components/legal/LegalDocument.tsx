import Link from "next/link";
import type { ReactNode } from "react";
import { EmergencyBanner } from "@/components/triage/EmergencyBanner";

export const LEGAL_CONTACT_EMAIL = "privacy@nauricare.com";
export const LEGAL_EFFECTIVE_DATE = "17 October 2026";

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

const RELATED = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
  { href: "/consent", label: "Informed Consent" },
];

export function LegalDocument({
  eyebrow,
  title,
  intro,
  sections,
  current,
}: {
  eyebrow: string;
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
  current: string;
}) {
  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-nc-primary">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-nc-ink sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm text-slate-500">Effective {LEGAL_EFFECTIVE_DATE}</p>
          <div className="mt-6 space-y-3 text-lg leading-relaxed text-slate-700">{intro}</div>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[16rem_1fr]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <nav aria-label="On this page" className="m3-card p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">On this page</p>
              <ol className="space-y-2 text-sm">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="flex gap-2 text-slate-700 hover:text-nc-primary">
                      <span className="w-5 shrink-0 text-slate-400">{i + 1}.</span>
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
              <div className="mt-5 border-t border-nc-divider pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Related</p>
                <ul className="space-y-1.5 text-sm">
                  {RELATED.filter((r) => r.href !== current).map((r) => (
                    <li key={r.href}>
                      <Link href={r.href} className="font-medium text-nc-primary hover:underline">{r.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          </aside>

          <article className="m3-card divide-y divide-nc-divider">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24 p-6 sm:p-8">
                <h2 className="text-xl font-bold text-nc-ink">
                  <span className="mr-2 text-nc-primary">{i + 1}.</span>
                  {s.title}
                </h2>
                <div className="mt-4 space-y-4 leading-relaxed text-slate-700 [&_a]:font-medium [&_a]:text-nc-primary [&_a]:underline [&_a]:underline-offset-2 [&_li]:pl-1 [&_strong]:text-nc-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                  {s.body}
                </div>
              </section>
            ))}
            <section className="p-6 sm:p-8">
              <EmergencyBanner />
              <p className="mt-6 text-sm text-slate-600">
                Questions about this document? Email{" "}
                <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="font-medium text-nc-primary underline underline-offset-2">
                  {LEGAL_CONTACT_EMAIL}
                </a>
                .
              </p>
            </section>
          </article>
        </div>
      </div>
    </div>
  );
}
