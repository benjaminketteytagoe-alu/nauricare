import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { cookies } from "next/headers";
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
    <div className="max-w-4xl mx-auto">
      <CycleCalendarClient initialData={data} />
    </div>
  );
}
