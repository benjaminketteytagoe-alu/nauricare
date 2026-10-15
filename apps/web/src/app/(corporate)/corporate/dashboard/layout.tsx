import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// There is no dedicated "HR admin" role in the Role enum (PATIENT / PROVIDER
// / ADMIN) — the corporate signup flow never creates a User account for the
// HR contact, it only records their details on Organization. So instead of
// adding a role for a single page, access here is granted to whichever
// signed-in NauriCare user's email matches the `contactEmail` captured for
// an org at signup time. That means an HR contact must have (or create) an
// ordinary NauriCare account under that same email to view this dashboard.
export default async function CorporateDashboardLayout({ children }: { children: React.ReactNode }) {
  await cookies();
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const org = await prisma.organization.findFirst({
    where: { contactEmail: { equals: session.user.email, mode: "insensitive" } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!org) redirect("/corporate/pricing");

  return <>{children}</>;
}
