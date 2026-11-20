import { KeyRound, ShieldCheck, Timer } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { SUPPORT_EMAIL } from "@/lib/site";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Africa/Kigali" });

// Admin accounts are created and rotated with the staff-access tool (and its
// approval-gated workflow), never edited here, so this page only shows the
// account and the security rules that apply to it.
export default async function AdminSettingsPage() {
  const session = await requireRole("ADMIN");
  const me = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { name: true, email: true, createdAt: true },
  });

  const row = "flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between";
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader eyebrow="Account" title="Settings" description="Your admin account and how it is protected." />

      <section aria-labelledby="account" className="rounded-card border border-hairline bg-surface px-6 shadow-card">
        <h2 id="account" className="sr-only">
          Account
        </h2>
        <dl className="divide-y divide-hairline text-sm">
          <div className={row}>
            <dt className="text-ink-muted">Name</dt>
            <dd className="font-medium text-ink">{me.name}</dd>
          </div>
          <div className={row}>
            <dt className="text-ink-muted">Email</dt>
            <dd className="font-medium text-ink">{me.email}</dd>
          </div>
          <div className={row}>
            <dt className="text-ink-muted">Admin since</dt>
            <dd className="font-medium text-ink">{dateFmt.format(me.createdAt)}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="security" className="space-y-4">
        <h2 id="security" className="font-display text-display-md text-ink">
          Security
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "Code at every sign-in",
              body: "Each sign-in needs a 6-digit code sent to your email.",
            },
            {
              icon: Timer,
              title: "15-minute idle limit",
              body: "Admin sessions end after 15 idle minutes and can't be kept signed in.",
            },
            {
              icon: KeyRound,
              title: "Password change signs out everywhere",
              body: "Changing your password ends every other session at once.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-card border border-hairline bg-surface p-5 shadow-card">
              <Icon className="size-5 text-brand-ink" aria-hidden />
              <p className="mt-3 font-semibold text-ink">{title}</p>
              <p className="mt-1 text-sm text-ink-soft">{body}</p>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-hairline bg-surface-muted p-5 text-sm text-ink-soft">
          <span className="min-w-0 flex-1">
            To change your password we email you a single-use link. Lost access or think your account is at risk?
            Contact{" "}
            <a className="font-medium text-brand-ink underline underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            .
          </span>
          <Link
            href="/forgot-password"
            className="inline-flex h-10 items-center rounded-full bg-brand px-5 font-medium text-on-brand shadow-button hover:bg-brand-hover"
          >
            Change password
          </Link>
        </div>
      </section>
    </div>
  );
}
