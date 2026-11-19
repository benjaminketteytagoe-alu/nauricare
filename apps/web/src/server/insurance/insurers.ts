import { prisma } from "@/lib/prisma";
import { insurerKey } from "@/lib/referrals/constants";

// Private insurers patients have typed in under "Other private insurer".
// A name is offered as its own option only once at least MIN_PATIENTS
// different patients have entered it, so one patient's entry is never
// revealed to anyone else, and typos and one-offs stay out of the list.

const MIN_PATIENTS = 2;
const MAX_INSURERS = 12;

export async function knownPrivateInsurers(): Promise<string[]> {
  const rows = await prisma.patientInsurance.findMany({
    where: { provider: "OTHER_PRIVATE", otherProviderName: { not: null } },
    select: { otherProviderName: true },
    take: 5000,
  });

  // Group spelling variants; display the most common spelling.
  const groups = new Map<string, { count: number; spellings: Map<string, number> }>();
  for (const { otherProviderName } of rows) {
    const name = otherProviderName!.trim();
    const key = insurerKey(name);
    if (!key) continue;
    const g = groups.get(key) ?? { count: 0, spellings: new Map() };
    g.count++; // PatientInsurance.userId is unique, so each row is a distinct patient
    g.spellings.set(name, (g.spellings.get(name) ?? 0) + 1);
    groups.set(key, g);
  }

  return [...groups.values()]
    .filter((g) => g.count >= MIN_PATIENTS)
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_INSURERS)
    .map((g) => [...g.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0])
    .sort((a, b) => a.localeCompare(b));
}
