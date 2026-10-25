import type { PatientActivityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const ACTIVITY_PAGE_SIZE = 30;

/** A patient's own activity, newest first, cursor-paginated. */
export async function listActivity(userId: string, opts: { types?: PatientActivityType[]; cursor?: string }) {
  const rows = await prisma.patientActivity.findMany({
    where: { userId, ...(opts.types?.length ? { type: { in: opts.types } } : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: ACTIVITY_PAGE_SIZE + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    select: { id: true, type: true, title: true, details: true, refType: true, refId: true, createdAt: true },
  });
  const hasMore = rows.length > ACTIVITY_PAGE_SIZE;
  const items = rows.slice(0, ACTIVITY_PAGE_SIZE);
  return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
}

export async function activityCounts(userId: string) {
  const grouped = await prisma.patientActivity.groupBy({ by: ["type"], where: { userId }, _count: { _all: true } });
  return Object.fromEntries(grouped.map((g) => [g.type, g._count._all])) as Partial<Record<PatientActivityType, number>>;
}
