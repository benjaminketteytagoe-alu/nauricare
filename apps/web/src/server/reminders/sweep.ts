import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import { sendReminderEmail } from "@/lib/email";
import { diffInDays, parseDateKey, toDateKey } from "@/lib/cycleDates";
import { predictCycle } from "@/lib/cycle/predict";
import { formatInZone, zonedParts } from "@/lib/time/zoned";
import { notifyOrThrow } from "@/server/notifications/notify";
import { REMINDER_DEFAULTS } from "./preferences";
import { claim, deliver } from "./dispatch";

// The reminder sweep, triggered by AWS EventBridge via POST /api/cron/execute.
// Safe to run often, concurrently and repeatedly: every reminder goes through
// the ReminderDispatch ledger (claim -> deliver -> SENT), so overlapping or
// retried runs never send the same reminder twice, and failed sends are
// retried on the next run. All queries are processed in batches.

export const BATCH_SIZE = 100;
const EARLIEST_LOCAL_HOUR = 8; // never ping a period reminder before 08:00 local
const EMAIL_GAP_MS = 600; // stay under Resend's per-second rate limit

export interface SweepResult {
  period: number;
  daily: number;
  weekly: number;
  appointments: number;
  failed: number;
  ms: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";
const settingsUrl = `${SITE_URL}/dashboard/settings?tab=reminders`;

/** Sends one email at a time, spaced out; throws so the ledger records failures. */
function createMailer() {
  let last = 0;
  return async (args: Parameters<typeof sendReminderEmail>[0]) => {
    const wait = last + EMAIL_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    await sendReminderEmail(args);
  };
}
type Mailer = ReturnType<typeof createMailer>;

/** Cursor-paginate a query in batches of BATCH_SIZE. */
async function forEachBatch<T extends { id: string }>(page: (cursor?: string) => Promise<T[]>, handle: (rows: T[]) => Promise<void>) {
  let cursor: string | undefined;
  for (;;) {
    const rows = await page(cursor);
    if (rows.length === 0) return;
    await handle(rows);
    if (rows.length < BATCH_SIZE) return;
    cursor = rows.at(-1)!.id;
  }
}
const paging = (cursor?: string) => ({ orderBy: { id: "asc" as const }, take: BATCH_SIZE, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });

export async function runReminderSweep(now = new Date()): Promise<SweepResult> {
  const started = Date.now();
  const result: SweepResult = { period: 0, daily: 0, weekly: 0, appointments: 0, failed: 0, ms: 0 };
  const mail = createMailer();
  const tally = (ok: boolean, key: "period" | "daily" | "weekly" | "appointments") => (ok ? result[key]++ : result.failed++);

  await periodReminders(now, mail, (ok) => tally(ok, "period"));
  await dailyLogReminders(now, mail, (ok) => tally(ok, "daily"));
  await weeklyInsights(now, mail, (ok) => tally(ok, "weekly"));
  await appointmentReminders(now, mail, (ok) => tally(ok, "appointments"));

  result.ms = Date.now() - started;
  // Heartbeat: lets admins (and alarms) see that the scheduler is alive.
  await prisma.auditEvent.create({ data: { action: "CRON_REMINDERS_RUN", details: { ...result, at: now.toISOString() } } }).catch(() => {});
  return result;
}

// ── Period: N days before the predicted start ─────────────────────────────
async function periodReminders(now: Date, mail: Mailer, tally: (ok: boolean) => void) {
  await forEachBatch(
    (cursor) =>
      prisma.patientProfile.findMany({
        where: {
          cycleLogs: { some: {} },
          user: { deletedAt: null, OR: [{ reminderPreference: { is: null } }, { reminderPreference: { is: { periodReminders: true } } }] },
        },
        select: {
          id: true,
          userId: true,
          menstrualCycle: true,
          user: { select: { name: true, email: true, reminderPreference: { select: { periodLeadDays: true, timezone: true, emailEnabled: true } } } },
          cycleLogs: { select: { startDate: true, endDate: true }, orderBy: { startDate: "desc" }, take: 13 },
        },
        ...paging(cursor),
      }),
    async (patients) => {
      for (const p of patients) {
        const prefs = { ...REMINDER_DEFAULTS, ...p.user.reminderPreference };
        const local = zonedParts(now, prefs.timezone);
        if (local.hour < EARLIEST_LOCAL_HOUR) continue;
        const { prediction } = predictCycle(p.cycleLogs, Number(p.menstrualCycle) || null);
        if (!prediction) continue;
        const daysUntil = diffInDays(prediction.nextStart, parseDateKey(local.dateKey));
        if (daysUntil < 0 || daysUntil > prefs.periodLeadDays) continue;

        const c = await claim(`period:${p.userId}:${toDateKey(prediction.nextStart)}`, "period", p.userId);
        if (!c) continue;
        const when = daysUntil === 0 ? "today" : daysUntil === 1 ? "tomorrow" : `in ${daysUntil} days`;
        const title = `Your period is predicted to start ${when}`;
        const body = "A gentle heads-up so you can be prepared. Log it in My Cycle when it starts to keep predictions accurate.";
        tally(
          await deliver(c, {
            notify: () => notifyOrThrow({ recipientId: p.userId, type: "PERIOD_REMINDER", title, body, link: "/dashboard/cycle" }),
            email: prefs.emailEnabled
              ? (idempotencyKey) => mail({ to: p.user.email, subject: title, name: firstName(p.user.name), heading: title, body, ctaLabel: "Open My Cycle", ctaUrl: `${SITE_URL}/dashboard/cycle`, settingsUrl, idempotencyKey })
              : undefined,
          }),
        );
      }
    },
  );
}

// ── Daily: nudge to log, at the chosen local hour, skipped if already logged ──
async function dailyLogReminders(now: Date, mail: Mailer, tally: (ok: boolean) => void) {
  await forEachBatch(
    (cursor) =>
      prisma.reminderPreference.findMany({
        where: { dailyLogReminders: true, user: { role: "PATIENT", deletedAt: null } },
        select: { id: true, userId: true, reminderHour: true, timezone: true, emailEnabled: true, user: { select: { name: true, email: true, patientProfile: { select: { id: true } } } } },
        ...paging(cursor),
      }),
    async (prefs) => {
      for (const pref of prefs) {
        const local = zonedParts(now, pref.timezone);
        if (local.hour < pref.reminderHour) continue;
        const profileId = pref.user.patientProfile?.id;
        const today = parseDateKey(local.dateKey);
        if (profileId) {
          const [habits, day] = await Promise.all([
            prisma.habitLog.count({ where: { patientProfileId: profileId, date: today } }),
            prisma.cycleDayLog.count({ where: { patientProfileId: profileId, date: today } }),
          ]);
          if (habits + day > 0) continue; // already logged today: nothing to nudge about
        }
        const c = await claim(`daily:${pref.userId}:${local.dateKey}`, "daily", pref.userId);
        if (!c) continue;
        const title = "How are you feeling today?";
        const body = "Take 30 seconds to log your symptoms and mood. Small daily notes make your cycle insights much more accurate.";
        tally(
          await deliver(c, {
            notify: () => notifyOrThrow({ recipientId: pref.userId, type: "SYSTEM", title, body, link: "/dashboard/cycle" }),
            email: pref.emailEnabled
              ? (idempotencyKey) => mail({ to: pref.user.email, subject: title, name: firstName(pref.user.name), heading: title, body, ctaLabel: "Log today", ctaUrl: `${SITE_URL}/dashboard/cycle`, settingsUrl, idempotencyKey })
              : undefined,
          }),
        );
      }
    },
  );
}

// ── Weekly: Monday summary at the chosen local hour ───────────────────────
async function weeklyInsights(now: Date, mail: Mailer, tally: (ok: boolean) => void) {
  await forEachBatch(
    (cursor) =>
      prisma.reminderPreference.findMany({
        where: { weeklyInsights: true, user: { role: "PATIENT", deletedAt: null } },
        select: { id: true, userId: true, reminderHour: true, timezone: true, emailEnabled: true, user: { select: { name: true, email: true, patientProfile: { select: { id: true, menstrualCycle: true } } } } },
        ...paging(cursor),
      }),
    async (prefs) => {
      for (const pref of prefs) {
        const local = zonedParts(now, pref.timezone);
        if (local.weekday !== 1 || local.hour < pref.reminderHour) continue;
        const c = await claim(`weekly:${pref.userId}:${local.dateKey}`, "weekly", pref.userId);
        if (!c) continue;

        const today = parseDateKey(local.dateKey);
        const profile = pref.user.patientProfile;
        let body = "Here's your week at a glance. Keep logging to unlock more personal insights.";
        if (profile) {
          const weekAgo = new Date(today.getTime() - 7 * 86_400_000);
          const [dayLogs, logs] = await Promise.all([
            prisma.cycleDayLog.count({ where: { patientProfileId: profile.id, date: { gte: weekAgo, lt: today } } }),
            prisma.cycleLog.findMany({ where: { patientProfileId: profile.id }, select: { startDate: true, endDate: true }, orderBy: { startDate: "desc" }, take: 13 }),
          ]);
          const { prediction } = predictCycle(logs, Number(profile.menstrualCycle) || null);
          const parts = [`You logged ${dayLogs} of the last 7 days.`];
          if (prediction) {
            const days = diffInDays(prediction.nextStart, today);
            if (days > 0) parts.push(`Your next period is predicted in about ${days} days.`);
          }
          body = parts.join(" ");
        }
        const title = "Your weekly health check-in";
        tally(
          await deliver(c, {
            notify: () => notifyOrThrow({ recipientId: pref.userId, type: "SYSTEM", title, body, link: "/dashboard/cycle" }),
            email: pref.emailEnabled
              ? (idempotencyKey) => mail({ to: pref.user.email, subject: title, name: firstName(pref.user.name), heading: title, body, ctaLabel: "See my cycle", ctaUrl: `${SITE_URL}/dashboard/cycle`, settingsUrl, idempotencyKey })
              : undefined,
          }),
        );
      }
    },
  );
}

// ── Appointments: within 24 hours of the start; flag set once delivered ───
async function appointmentReminders(now: Date, mail: Mailer, tally: (ok: boolean) => void) {
  await forEachBatch(
    (cursor) =>
      prisma.appointment.findMany({
        where: { status: "SCHEDULED", reminderSentAt: null, startTime: { gt: now, lte: new Date(now.getTime() + 24 * 3_600_000) } },
        select: {
          id: true,
          startTime: true,
          patient: { select: { user: { select: { id: true, name: true, email: true, deletedAt: true, reminderPreference: { select: { appointmentReminders: true, emailEnabled: true, timezone: true } } } } } },
          practitioner: { select: { user: { select: { id: true, name: true } } } },
        },
        ...paging(cursor),
      }),
    async (appointments) => {
      for (const a of appointments) {
        const patient = a.patient.user;
        const doctor = a.practitioner.user;
        const prefs = { ...REMINDER_DEFAULTS, ...patient.reminderPreference };

        // Provider: always reminded (in-app).
        const pc = await claim(`appointment:${a.id}:provider`, "appointment-provider", doctor.id);
        const providerDone = pc
          ? await deliver(pc, { notify: () => notifyOrThrow({ recipientId: doctor.id, type: "APPOINTMENT_REMINDER", title: `Consultation with ${patient.name} soon`, body: `Starts ${formatInZone(a.startTime, "Africa/Kigali")}.`, link: "/provider/schedule" }) })
          : await alreadySent(`appointment:${a.id}:provider`);

        // Patient: per their settings.
        let patientDone = true;
        if (prefs.appointmentReminders && !patient.deletedAt) {
          const c = await claim(`appointment:${a.id}:patient`, "appointment", patient.id);
          if (c) {
            const title = `Reminder: your consultation with ${doctor.name}`;
            const body = `Your video consultation starts ${formatInZone(a.startTime, prefs.timezone)}. Join a few minutes early and check your camera and microphone.`;
            patientDone = await deliver(c, {
              notify: () => notifyOrThrow({ recipientId: patient.id, type: "APPOINTMENT_REMINDER", title, body, link: `/dashboard/telehealth/${a.id}` }),
              email: prefs.emailEnabled
                ? (idempotencyKey) => mail({ to: patient.email, subject: title, name: firstName(patient.name), heading: title, body, ctaLabel: "View my consultation", ctaUrl: `${SITE_URL}/dashboard/telehealth/${a.id}`, settingsUrl, idempotencyKey })
                : undefined,
            });
            tally(patientDone);
          } else patientDone = await alreadySent(`appointment:${a.id}:patient`);
        }

        // The "reminder sent" flag is only set once every reminder was delivered.
        if (providerDone && patientDone) {
          await prisma.appointment.updateMany({ where: { id: a.id, reminderSentAt: null }, data: { reminderSentAt: new Date() } });
        }
      }
    },
  );
}

async function alreadySent(dedupeKey: string): Promise<boolean> {
  return (await prisma.reminderDispatch.count({ where: { dedupeKey, status: "SENT" } })) > 0;
}
