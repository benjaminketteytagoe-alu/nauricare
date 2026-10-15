import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requirePremiumPage } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

// AI Symptom Checker is a gated premium feature — see PRD "Premium Feature
// Access Control". This layout guards every route under /dashboard/symptoms
// without touching the existing page/component code.
export default async function SymptomsLayout({ children }: { children: React.ReactNode }) {
  await cookies(); // forces dynamic rendering — prevents cross-user cache leak
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  await requirePremiumPage(session.user.id);

  return <>{children}</>;
}
