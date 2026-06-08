import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";

export default async function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  // 1. Get the current authenticated session securely on the backend
  const session = await getServerSession(authOptions);

  // 2. Gatekeeper: Query Prisma to ensure PATIENT users have completed their profile
  if (session?.user?.role === "PATIENT") {
    const profile = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
    });

    // 3. Force redirect if the critical relation is missing
    if (!profile) {
      redirect("/onboarding");
    }
  }

  // 4. Render the UI (Injecting the Client Component Sidebar)
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
