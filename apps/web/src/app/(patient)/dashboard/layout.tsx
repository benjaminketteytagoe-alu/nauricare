import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { Sidebar } from "@/components/Sidebar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  await cookies(); // forces dynamic rendering — prevents cross-user cache leak
  const session = await getServerSession(authOptions);

  // 2. Explicit Security Gate: Ensure a valid user session exists
  if (!session || !session.user) {
    redirect("/login");
  }

  // 3. Role Boundary Protection: Instantly bounce non-patient accounts to their proper domains
  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }
  if (session.user.role === "PROVIDER") {
    redirect("/provider");
  }

  // 4. Gatekeeper: Verify PATIENT users have completed their health onboarding profile
  const profile = await prisma.patientProfile.findUnique({
    where: { userId: session.user.id },
  });

  // Force redirect if the client profile relation is missing
  if (!profile) {
    redirect("/onboarding");
  }

  // 5. Render the explicit Patient Dashboard UI shell
  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
