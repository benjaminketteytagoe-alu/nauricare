"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { addDays, diffInDays, parseDateKey, toDateKey } from "@/lib/cycleDates";
import type { PatientProfile } from "@prisma/client";

const DEFAULT_CYCLE_LENGTH = 28;
const DEFAULT_PERIOD_LENGTH = 5;

export type CycleLogEntry = {
  id: string;
  startDate: string;
  endDate: string | null;
  cycleLength: number | null;
  periodLength: number | null;
  notes: string | null;
};

export type CyclePrediction = {
  nextStart: string;
  nextEnd: string;
  ovulationDay: string;
};

export type CycleAverages = {
  cycleLength: number;
  periodLength: number;
};

export type CycleData = {
  logs: CycleLogEntry[];
  prediction: CyclePrediction | null;
  averages: CycleAverages;
};

async function requirePatientProfile(): Promise<{ error: string } | { profile: PatientProfile }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return { error: "Unauthorized" as const };
  }

  const profile = await prisma.patientProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    return { error: "Patient profile not found. Please complete onboarding." as const };
  }

  return { profile };
}

export async function logPeriodRange({
  startDate,
  endDate,
  notes,
}: {
  startDate: string;
  endDate: string;
  notes?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const auth = await requirePatientProfile();
    if ("error" in auth) return { success: false, error: auth.error };

    const start = parseDateKey(startDate);
    const end = parseDateKey(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { success: false, error: "Invalid date." };
    }
    if (end < start) {
      return { success: false, error: "End date must be on or after the start date." };
    }

    const periodLength = diffInDays(end, start) + 1;

    // Derive this log's cycle length from the gap to the previous logged
    // period, if one exists, so historical rows stay self-descriptive.
    const previousLog = await prisma.cycleLog.findFirst({
      where: { patientProfileId: auth.profile.id, startDate: { lt: start } },
      orderBy: { startDate: "desc" },
    });
    const cycleLength = previousLog ? diffInDays(start, previousLog.startDate) : undefined;

    await prisma.cycleLog.create({
      data: {
        patientProfileId: auth.profile.id,
        startDate: start,
        endDate: end,
        periodLength,
        ...(cycleLength !== undefined ? { cycleLength } : {}),
        notes: notes?.trim() || undefined,
      },
    });

    revalidatePath("/dashboard/cycle");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("[LOG_PERIOD_RANGE_ERROR]", error);
    return { success: false, error: "Failed to save period log." };
  }
}

export async function getCycleData(): Promise<CycleData> {
  const auth = await requirePatientProfile();
  if ("error" in auth) {
    return { logs: [], prediction: null, averages: { cycleLength: DEFAULT_CYCLE_LENGTH, periodLength: DEFAULT_PERIOD_LENGTH } };
  }

  const logs = await prisma.cycleLog.findMany({
    where: { patientProfileId: auth.profile.id },
    orderBy: { startDate: "desc" },
  });

  if (logs.length === 0) {
    return { logs: [], prediction: null, averages: { cycleLength: DEFAULT_CYCLE_LENGTH, periodLength: DEFAULT_PERIOD_LENGTH } };
  }

  // Oldest-first for computing gaps between consecutive periods.
  const ascending = [...logs].reverse();

  const cycleGaps: number[] = [];
  for (let i = 1; i < ascending.length; i++) {
    cycleGaps.push(diffInDays(ascending[i].startDate, ascending[i - 1].startDate));
  }
  const averageCycleLength = cycleGaps.length > 0
    ? Math.round(cycleGaps.reduce((sum, n) => sum + n, 0) / cycleGaps.length)
    : DEFAULT_CYCLE_LENGTH;

  const periodDurations = logs
    .filter((log) => log.endDate)
    .map((log) => diffInDays(log.endDate as Date, log.startDate) + 1);
  const averagePeriodLength = periodDurations.length > 0
    ? Math.round(periodDurations.reduce((sum, n) => sum + n, 0) / periodDurations.length)
    : DEFAULT_PERIOD_LENGTH;

  const lastLoggedStart = logs[0].startDate;
  const nextStart = addDays(lastLoggedStart, averageCycleLength);
  const nextEnd = addDays(nextStart, averagePeriodLength - 1);
  const ovulationDay = addDays(nextStart, -14);

  return {
    logs: logs.map((log) => ({
      id: log.id,
      startDate: toDateKey(log.startDate),
      endDate: log.endDate ? toDateKey(log.endDate) : null,
      cycleLength: log.cycleLength,
      periodLength: log.periodLength,
      notes: log.notes,
    })),
    prediction: {
      nextStart: toDateKey(nextStart),
      nextEnd: toDateKey(nextEnd),
      ovulationDay: toDateKey(ovulationDay),
    },
    averages: {
      cycleLength: averageCycleLength,
      periodLength: averagePeriodLength,
    },
  };
}
