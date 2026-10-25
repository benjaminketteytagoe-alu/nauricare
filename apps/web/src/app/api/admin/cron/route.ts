import { apiSuccess, handle, unauthorized } from "@/lib/api";
import { getUserIdWithRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { cronConfigured } from "@/server/reminders/cronAuth";

// Reminder scheduler health for admins: last runs and stuck/failed reminders.
export async function GET() {
  if (!(await getUserIdWithRole("ADMIN"))) return unauthorized();
  return handle(async () => {
    const [runs, failed, stuck] = await Promise.all([
      prisma.auditEvent.findMany({ where: { action: "CRON_REMINDERS_RUN" }, orderBy: { createdAt: "desc" }, take: 10, select: { createdAt: true, details: true } }),
      prisma.reminderDispatch.findMany({ where: { status: "FAILED" }, orderBy: { claimedAt: "desc" }, take: 20, select: { dedupeKey: true, kind: true, attempts: true, lastError: true, claimedAt: true } }),
      prisma.reminderDispatch.count({ where: { status: "CLAIMED", claimedAt: { lt: new Date(Date.now() - 15 * 60_000) } } }),
    ]);
    const lastRunAt = runs[0]?.createdAt ?? null;
    return apiSuccess({
      configured: cronConfigured(),
      lastRunAt,
      healthy: !!lastRunAt && Date.now() - lastRunAt.getTime() < 45 * 60_000, // expect a run every 15 minutes
      runs,
      failed,
      stuckClaims: stuck,
    }, 200, { "Cache-Control": "no-store" });
  });
}
