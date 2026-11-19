"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { FlowLevel, PatientProfile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-guards";
import { sanitizePlainText } from "@/lib/sanitize";
import { addDays, diffInDays, parseDateKey, toDateKey } from "@/lib/cycleDates";
import { DEFAULT_CYCLE_LENGTH, DEFAULT_PERIOD_LENGTH, predictCycle } from "@/lib/cycle/predict";
import { MOOD_IDS, SYMPTOM_IDS } from "@/lib/cycle/catalog";
import { recordActivity } from "@/server/activity/activity.service";

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
  fertileStart: string;
  fertileEnd: string;
};

export type CycleAverages = { cycleLength: number; periodLength: number };

export type DayLogEntry = { date: string; flow: FlowLevel | null; symptoms: string[]; moods: string[]; notes: string | null };

export type CycleData = {
  logs: CycleLogEntry[];
  prediction: CyclePrediction | null;
  averages: CycleAverages;
  dayLogs: DayLogEntry[];
  goals: string[];
};

type Result = { success: true } | { success: false; error: string };

const EMPTY: CycleData = {
  logs: [],
  prediction: null,
  averages: { cycleLength: DEFAULT_CYCLE_LENGTH, periodLength: DEFAULT_PERIOD_LENGTH },
  dayLogs: [],
  goals: [],
};
const DAY_LOG_WINDOW_DAYS = 200;
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date.").refine((k) => !Number.isNaN(parseDateKey(k).getTime()), "Invalid date.");

async function requirePatientProfile(): Promise<{ error: string } | { profile: PatientProfile }> {
  const user = await getSessionUser();
  if (!user || user.role !== "PATIENT") return { error: "Unauthorized" };
  const profile = await prisma.patientProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return { error: "Patient profile not found. Please complete onboarding." };
  return { profile };
}

/** Can't log the future (beyond tomorrow, allowing for time zones). */
function isFuture(key: string): boolean {
  return key > toDateKey(addDays(new Date(), 1));
}

function refresh() {
  revalidatePath("/dashboard/cycle");
  revalidatePath("/dashboard");
}

/** Another logged period overlapping [start, end] (end null = open-ended). */
async function overlapping(profileId: string, start: Date, end: Date, excludeId?: string) {
  return prisma.cycleLog.findFirst({
    where: {
      patientProfileId: profileId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      startDate: { lte: end },
      OR: [{ endDate: { gte: start } }, { endDate: null, startDate: { gte: addDays(start, -10) } }],
    },
    select: { id: true },
  });
}

export async function logPeriodRange({ startDate, endDate, notes }: { startDate: string; endDate: string; notes?: string }): Promise<Result> {
  try {
    const auth = await requirePatientProfile();
    if ("error" in auth) return { success: false, error: auth.error };
    const parsed = z.object({ startDate: dateKey, endDate: dateKey, notes: z.string().max(1000).optional() }).safeParse({ startDate, endDate, notes });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const start = parseDateKey(startDate);
    const end = parseDateKey(endDate);
    if (end < start) return { success: false, error: "End date must be on or after the start date." };
    if (isFuture(endDate)) return { success: false, error: "You can't log a period in the future." };
    const periodLength = diffInDays(end, start) + 1;
    if (periodLength > 14) return { success: false, error: "A period longer than 14 days should be checked by a doctor. Please log up to 14 days." };
    if (await overlapping(auth.profile.id, start, end)) return { success: false, error: "These dates overlap a period you've already logged." };

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
        notes: notes ? sanitizePlainText(notes) || undefined : undefined,
      },
    });
    await recordActivity({ userId: auth.profile.userId, type: "CYCLE_LOGGED", title: `Logged a period (${periodLength} day${periodLength === 1 ? "" : "s"})`, details: { startDate, endDate } });
    refresh();
    return { success: true };
  } catch (error) {
    console.error("[LOG_PERIOD_RANGE_ERROR]", error);
    return { success: false, error: "Failed to save period log." };
  }
}

/** "My period started" (open-ended until the patient says it ended). */
export async function startPeriod(day: string): Promise<Result> {
  try {
    const auth = await requirePatientProfile();
    if ("error" in auth) return { success: false, error: auth.error };
    if (!dateKey.safeParse(day).success || isFuture(day)) return { success: false, error: "Choose today or a past date." };
    const start = parseDateKey(day);
    if (await overlapping(auth.profile.id, start, start)) return { success: false, error: "You've already logged a period around this date." };
    const previous = await prisma.cycleLog.findFirst({ where: { patientProfileId: auth.profile.id, startDate: { lt: start } }, orderBy: { startDate: "desc" } });
    await prisma.cycleLog.create({
      data: { patientProfileId: auth.profile.id, startDate: start, ...(previous ? { cycleLength: diffInDays(start, previous.startDate) } : {}) },
    });
    await recordActivity({ userId: auth.profile.userId, type: "CYCLE_LOGGED", title: "Logged the start of a period", details: { startDate: day } });
    refresh();
    return { success: true };
  } catch (error) {
    console.error("[START_PERIOD_ERROR]", error);
    return { success: false, error: "Failed to log your period." };
  }
}

/** Close the open period on `day`. */
export async function endPeriod(day: string): Promise<Result> {
  try {
    const auth = await requirePatientProfile();
    if ("error" in auth) return { success: false, error: auth.error };
    if (!dateKey.safeParse(day).success || isFuture(day)) return { success: false, error: "Choose today or a past date." };
    const latest = await prisma.cycleLog.findFirst({ where: { patientProfileId: auth.profile.id }, orderBy: { startDate: "desc" } });
    const open = latest && !latest.endDate && diffInDays(parseDateKey(day), latest.startDate) < 14 ? latest : null;
    if (!open) return { success: false, error: "There's no ongoing period to end." };
    const end = parseDateKey(day);
    if (end < open.startDate) return { success: false, error: "The end date must be on or after the start date." };
    await prisma.cycleLog.update({ where: { id: open.id }, data: { endDate: end, periodLength: diffInDays(end, open.startDate) + 1 } });
    refresh();
    return { success: true };
  } catch (error) {
    console.error("[END_PERIOD_ERROR]", error);
    return { success: false, error: "Failed to update your period." };
  }
}

export async function deletePeriod(id: string): Promise<Result> {
  try {
    const auth = await requirePatientProfile();
    if ("error" in auth) return { success: false, error: auth.error };
    // Scoped to the caller's own profile, so another patient's id matches nothing.
    const { count } = await prisma.cycleLog.deleteMany({ where: { id: z.string().max(64).parse(id), patientProfileId: auth.profile.id } });
    if (count === 0) return { success: false, error: "Period not found." };
    refresh();
    return { success: true };
  } catch (error) {
    console.error("[DELETE_PERIOD_ERROR]", error);
    return { success: false, error: "Failed to delete that period." };
  }
}

const DayLogInput = z.object({
  date: dateKey,
  flow: z.enum(["NONE", "SPOTTING", "LIGHT", "MEDIUM", "HEAVY"]).nullable(),
  symptoms: z.array(z.enum(SYMPTOM_IDS)).max(SYMPTOM_IDS.length),
  moods: z.array(z.enum(MOOD_IDS)).max(MOOD_IDS.length),
  notes: z.string().max(1000, "Notes must be under 1000 characters.").nullable(),
});

/** Save (or clear) the daily log for one day. */
export async function saveDayLog(input: z.infer<typeof DayLogInput>): Promise<Result> {
  try {
    const auth = await requirePatientProfile();
    if ("error" in auth) return { success: false, error: auth.error };
    const parsed = DayLogInput.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
    const { date, flow, symptoms, moods } = parsed.data;
    if (isFuture(date)) return { success: false, error: "You can't log a day in the future." };
    const notes = parsed.data.notes ? sanitizePlainText(parsed.data.notes) || null : null;
    const key = { patientProfileId_date: { patientProfileId: auth.profile.id, date: parseDateKey(date) } };

    if (!flow && symptoms.length === 0 && moods.length === 0 && !notes) {
      await prisma.cycleDayLog.deleteMany({ where: { patientProfileId: auth.profile.id, date: parseDateKey(date) } });
    } else {
      const data = { flow, symptoms: [...new Set(symptoms)], moods: [...new Set(moods)], notes };
      await prisma.cycleDayLog.upsert({ where: key, create: { patientProfileId: auth.profile.id, date: parseDateKey(date), ...data }, update: data });
    }
    refresh();
    return { success: true };
  } catch (error) {
    console.error("[SAVE_DAY_LOG_ERROR]", error);
    return { success: false, error: "Failed to save today's log." };
  }
}

export async function getCycleData(): Promise<CycleData> {
  const auth = await requirePatientProfile();
  if ("error" in auth) return EMPTY;

  const [logs, dayLogs] = await Promise.all([
    prisma.cycleLog.findMany({ where: { patientProfileId: auth.profile.id }, orderBy: { startDate: "desc" }, take: 24 }),
    prisma.cycleDayLog.findMany({
      where: { patientProfileId: auth.profile.id, date: { gte: addDays(new Date(), -DAY_LOG_WINDOW_DAYS) } },
      orderBy: { date: "asc" },
      select: { date: true, flow: true, symptoms: true, moods: true, notes: true },
    }),
  ]);

  const stats = predictCycle(logs, Number(auth.profile.menstrualCycle) || null);
  const p = stats.prediction;
  return {
    logs: logs.map((log) => ({
      id: log.id,
      startDate: toDateKey(log.startDate),
      endDate: log.endDate ? toDateKey(log.endDate) : null,
      cycleLength: log.cycleLength,
      periodLength: log.periodLength,
      notes: log.notes,
    })),
    prediction: p
      ? { nextStart: toDateKey(p.nextStart), nextEnd: toDateKey(p.nextEnd), ovulationDay: toDateKey(p.ovulationDay), fertileStart: toDateKey(p.fertileStart), fertileEnd: toDateKey(p.fertileEnd) }
      : null,
    averages: { cycleLength: stats.cycleLength, periodLength: stats.periodLength },
    dayLogs: dayLogs.map((d) => ({ date: toDateKey(d.date), flow: d.flow, symptoms: d.symptoms, moods: d.moods, notes: d.notes })),
    goals: auth.profile.healthGoals,
  };
}
