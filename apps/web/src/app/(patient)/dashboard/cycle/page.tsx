import { Droplet } from "lucide-react";
import { requireRole } from "@/lib/auth-guards";
import { getCycleData } from "./actions";
import { CycleTracker } from "./CycleTracker";

export const dynamic = "force-dynamic";

export default async function CyclePage() {
  await requireRole("PATIENT");
  const data = await getCycleData();

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <header>
        <h1 className="flex items-center gap-3 text-2xl font-bold text-nc-ink sm:text-3xl">
          <Droplet className="h-7 w-7 text-rose-600" aria-hidden /> My Cycle
        </h1>
        <p className="mt-1 text-slate-600">Track your period, log how you feel each day, and get guidance for every phase.</p>
      </header>
      <CycleTracker data={data} />
    </div>
  );
}
