import "server-only";
import { logger } from "@/lib/logger";
import { runReminderSweep } from "./sweep";

// Optional in-process scheduler (REMINDER_SCHEDULER=on), for local
// development or a single-server deployment. In production on ECS the sweep is
// triggered by AWS EventBridge (POST /api/cron/execute) instead, so web
// servers carry no timers. The ledger keeps either trigger idempotent.

const INTERVAL_MS = 10 * 60_000;
const FIRST_RUN_MS = 60_000;

const g = globalThis as unknown as { __ncReminderTimer?: NodeJS.Timeout; __ncReminderRunning?: boolean };

export function schedulerEnabled(): boolean {
  return process.env.REMINDER_SCHEDULER === "on";
}

async function tick() {
  if (g.__ncReminderRunning) return; // a slow sweep never overlaps itself
  g.__ncReminderRunning = true;
  try {
    const r = await runReminderSweep();
    if (r.period + r.daily + r.weekly + r.appointments + r.failed > 0) {
      logger.info(
        { event: "cron.reminders_run", ok: true, source: "in-process", result: r },
        "Reminder sweep finished",
      );
    }
  } catch (e) {
    logger.error({ event: "cron.reminders_run", ok: false, source: "in-process", err: e }, "Reminder sweep failed");
  } finally {
    g.__ncReminderRunning = false;
  }
}

export function startReminderScheduler() {
  if (!schedulerEnabled() || g.__ncReminderTimer) return;
  setTimeout(() => void tick(), FIRST_RUN_MS).unref();
  g.__ncReminderTimer = setInterval(() => void tick(), INTERVAL_MS);
  g.__ncReminderTimer.unref();
  logger.info({ event: "reminders.scheduler_started" }, "In-process reminder scheduler started (every 10 minutes)");
}
