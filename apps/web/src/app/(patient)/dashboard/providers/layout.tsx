import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requirePremiumPage } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

// Provider directory / booking is part of the gated "Teleconsultations /
// Direct Provider Messaging & Booking" premium feature. This layout guards
// every route under /dashboard/providers without touching the existing
// page/component code.
export default async function ProvidersLayout({ children }: { children: React.ReactNode }) {
  await cookies(); // forces dynamic rendering — prevents cross-user cache leak
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  await requirePremiumPage(session.user.id);

  return <>{children}</>;
}
