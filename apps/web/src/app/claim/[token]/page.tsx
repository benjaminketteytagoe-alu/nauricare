import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getInvitation } from "@/server/sourcing/sourcing.service";
import { ClaimForm } from "@/components/sourcing/ClaimForm";
import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Join NauriCare as a Specialist",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

export default async function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await getInvitation(token);
  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="mb-8 inline-block"><Image src="/logo-horizontal.jpg" alt="NauriCare" width={150} height={40} className="h-8 w-auto" /></Link>
        {!invitation ? (
          <div className="m3-card p-8 text-center">
            <h1 className="text-xl font-bold text-nc-ink">This invitation isn&apos;t valid any more</h1>
            <p className="mt-2 text-slate-600">It may have expired or already been used. If you&apos;ve already set up your account, you can log in.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/login" className="m3-btn-filled">Log in</Link>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="m3-btn-outlined">Contact NauriCare</a>
            </div>
          </div>
        ) : (
          <ClaimForm token={token} invitation={invitation} />
        )}
      </div>
    </main>
  );
}
