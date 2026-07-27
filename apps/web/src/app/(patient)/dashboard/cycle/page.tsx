import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { cookies } from "next/headers";
import { Droplet } from "lucide-react";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCycleData } from "./actions";
import { CycleCalendarClient } from "./CycleCalendarClient";

export const dynamic = "force-dynamic";

export default async function CyclePage() {
  await cookies(); // forces dynamic rendering — prevents cross-user cache leak
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "PATIENT") {
    redirect("/login");
  }

  const data = await getCycleData();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Droplet className="w-8 h-8 text-rose-600" />
          My Cycle &amp; Body
        </h1>
        <p className="text-gray-500 mt-1">Log your periods and see your predicted cycle at a glance.</p>
      </div>
      <CycleCalendarClient initialData={data} />
    </div>
  );
}
