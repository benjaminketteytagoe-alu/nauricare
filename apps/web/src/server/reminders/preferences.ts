import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isValidTimeZone } from "@/lib/time/zoned";

// Patient reminder settings. A patient without a row gets the schema
// defaults; the row is created on first save (or by the sweep on claim).

export const REMINDER_PREF_SELECT = {
  periodReminders: true,
  periodLeadDays: true,
  dailyLogReminders: true,
  weeklyInsights: true,
  appointmentReminders: true,
  emailEnabled: true,
  reminderHour: true,
  timezone: true,
} as const;

export type ReminderPrefs = {
  periodReminders: boolean;
  periodLeadDays: number;
  dailyLogReminders: boolean;
  weeklyInsights: boolean;
  appointmentReminders: boolean;
  emailEnabled: boolean;
  reminderHour: number;
  timezone: string;
};

export const REMINDER_DEFAULTS: ReminderPrefs = {
  periodReminders: true,
  periodLeadDays: 2,
  dailyLogReminders: false,
  weeklyInsights: false,
  appointmentReminders: true,
  emailEnabled: true,
  reminderHour: 19,
  timezone: "Africa/Kigali",
};

/** Partial update: only the fields sent are changed. */
export const ReminderPrefsPatch = z
  .object({
    periodReminders: z.boolean(),
    periodLeadDays: z.number().int().min(0).max(7),
    dailyLogReminders: z.boolean(),
    weeklyInsights: z.boolean(),
    appointmentReminders: z.boolean(),
    emailEnabled: z.boolean(),
    reminderHour: z.number().int().min(0).max(23),
    timezone: z.string().max(64).refine(isValidTimeZone, "Unknown time zone."),
  })
  .partial()
  .strict();

export async function getReminderPrefs(userId: string): Promise<ReminderPrefs> {
  const row = await prisma.reminderPreference.findUnique({ where: { userId }, select: REMINDER_PREF_SELECT });
  return row ?? REMINDER_DEFAULTS;
}

export async function updateReminderPrefs(userId: string, patch: z.infer<typeof ReminderPrefsPatch>): Promise<ReminderPrefs> {
  return prisma.reminderPreference.upsert({
    where: { userId },
    create: { userId, ...patch },
    update: patch,
    select: REMINDER_PREF_SELECT,
  });
}
