import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { Hospital, MapPin, Plus, Stethoscope } from "lucide-react";
import type { ReferralStatus } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<ReferralStatus, string> = {
  PENDING: "bg-nc-amber-container text-nc-amber",
  ACCEPTED: "bg-nc-primary-container text-nc-primary",
  COMPLETED: "bg-slate-100 text-slate-700",
  EXPIRED: "bg-slate-100 text-slate-500",
};

const SEVERITY_STYLE: Record<string, string> = {
  LOW: "text-nc-primary",
  MODERATE: "text-nc-amber",
  URGENT: "text-nc-berry",
};

export default async function ReferralsPage() {
  await cookies(); // forces dynamic rendering — prevents cross-user cache leak
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const referrals = await prisma.referral.findMany({
    where: { patientId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { hospital: { select: { name: true, address: true, district: true } } },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nc-ink sm:text-3xl">Hospital referrals</h1>
          <p className="mt-1 text-slate-600">Show the referral code at the hospital reception desk.</p>
        </div>
        <Link href="/dashboard/referrals/new" className="m3-btn-filled">
          <Plus className="h-4 w-4" aria-hidden /> New referral
        </Link>
      </header>

      {referrals.length === 0 ? (
        <div className="m3-card p-10 text-center">
          <Hospital className="mx-auto h-10 w-10 text-slate-400" aria-hidden />
          <h2 className="mt-3 font-semibold text-nc-ink">No referrals yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">
            Run a symptom check or start a referral when you need to see a specialist in person.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/dashboard/symptoms" className="m3-btn-outlined">Check symptoms</Link>
            <Link href="/dashboard/referrals/new" className="m3-btn-filled">Start a referral</Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-4">
          {referrals.map((r) => (
            <li key={r.id} className="m3-card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-lg font-bold tracking-wider text-nc-ink">{r.referralCode}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {r.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}
                    <span className={`font-semibold ${SEVERITY_STYLE[r.triageSeverity] ?? "text-slate-600"}`}>
                      {r.triageSeverity}
                    </span>
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[r.status]}`}>{r.status}</span>
              </div>
              <div className="mt-4 grid gap-3 border-t border-nc-divider pt-4 text-sm sm:grid-cols-2">
                <p className="flex items-start gap-2 text-slate-700">
                  <Hospital className="mt-0.5 h-4 w-4 shrink-0 text-nc-primary" aria-hidden />
                  <span>
                    <span className="block font-semibold text-nc-ink">{r.hospital.name}</span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <MapPin className="h-3.5 w-3.5" aria-hidden /> {r.hospital.address} · {r.hospital.district}
                    </span>
                  </span>
                </p>
                <p className="flex items-start gap-2 text-slate-700">
                  <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-nc-primary" aria-hidden />
                  <span className="font-semibold text-nc-ink">{r.specialtyRequired}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
