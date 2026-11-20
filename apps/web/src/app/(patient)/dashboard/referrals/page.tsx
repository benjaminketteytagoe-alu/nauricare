import { Hospital, MapPin, Plus, Stethoscope } from "lucide-react";
import Link from "next/link";
import { ReferralShareManager } from "@/components/referrals/ReferralShareManager";
import { REFERRAL_STATUS_TONE, SEVERITY_TEXT, StatusChip } from "@/components/ui/status-chip";
import { requireRole } from "@/lib/auth-guards";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  const session = await requireRole("PATIENT");

  const referrals = await prisma.referral.findMany({
    where: { patientId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { hospital: { select: { name: true, address: true, district: true } } },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">Hospital referrals</h1>
          <p className="mt-1 text-ink-soft">Show the referral code at the hospital reception desk.</p>
        </div>
        <Link href="/dashboard/referrals/new" className="m3-btn-filled">
          <Plus className="h-4 w-4" aria-hidden /> New referral
        </Link>
      </header>

      {referrals.length === 0 ? (
        <div className="m3-card p-10 text-center">
          <Hospital className="mx-auto h-10 w-10 text-ink-muted" aria-hidden />
          <h2 className="mt-3 font-semibold text-ink">No referrals yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
            Run a symptom check or start a referral when you need to see a specialist in person.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/dashboard/symptoms" className="m3-btn-outlined">
              Check symptoms
            </Link>
            <Link href="/dashboard/referrals/new" className="m3-btn-filled">
              Start a referral
            </Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-4">
          {referrals.map((r) => (
            <li key={r.id} className="m3-card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-lg font-bold tracking-wider text-ink">{r.referralCode}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {formatDate(r.createdAt)}
                    {" · "}
                    <span className={`font-semibold ${SEVERITY_TEXT[r.triageSeverity] ?? "text-ink-soft"}`}>
                      {r.triageSeverity}
                    </span>
                  </p>
                </div>
                <StatusChip tone={REFERRAL_STATUS_TONE[r.status]}>{r.status}</StatusChip>
              </div>
              <div className="mt-4 grid gap-3 border-t border-hairline pt-4 text-sm sm:grid-cols-2">
                <p className="flex items-start gap-2 text-ink-soft">
                  <Hospital className="mt-0.5 h-4 w-4 shrink-0 text-brand-ink" aria-hidden />
                  <span>
                    <span className="block font-semibold text-ink">{r.hospital.name}</span>
                    <span className="flex items-center gap-1 text-ink-muted">
                      <MapPin className="h-3.5 w-3.5" aria-hidden /> {r.hospital.address} · {r.hospital.district}
                    </span>
                  </span>
                </p>
                <p className="flex items-start gap-2 text-ink-soft">
                  <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-brand-ink" aria-hidden />
                  <span className="font-semibold text-ink">{r.specialtyRequired}</span>
                </p>
              </div>
              {(r.status === "PENDING" || r.status === "ACCEPTED") && (
                <ReferralShareManager referralId={r.id} referralCode={r.referralCode} hospitalName={r.hospital.name} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
