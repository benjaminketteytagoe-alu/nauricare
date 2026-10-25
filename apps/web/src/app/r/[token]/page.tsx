import type { Metadata } from "next";
import { HospitalReferralView } from "@/components/referrals/HospitalReferralView";

// Hospital-facing page for a shared referral. Never indexed, never cached, and
// no Referer header leaks the token to sites linked from here.
export const metadata: Metadata = {
  title: "Patient Referral",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

export default async function SharedReferralPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <HospitalReferralView token={token} />;
}
