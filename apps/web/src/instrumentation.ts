// Runs once when each Next.js server starts (see Next.js "instrumentation").
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startReminderScheduler, schedulerEnabled } = await import("@/server/reminders/scheduler");
  const { cronConfigured } = await import("@/server/reminders/cronAuth");
  startReminderScheduler();
  if (process.env.NODE_ENV === "production" && !cronConfigured() && !schedulerEnabled()) {
    console.warn("[REMINDERS] CRON_SECRET is not set (32+ chars): /api/cron/execute is disabled and no reminders will be sent.");
  }
  if (process.env.NODE_ENV === "production" && !process.env.DATA_ENCRYPTION_KEY) {
    console.warn("[SECURITY] DATA_ENCRYPTION_KEY is not set: sealed data falls back to NEXTAUTH_SECRET.");
  }
}
