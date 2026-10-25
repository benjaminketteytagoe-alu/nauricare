import { after, NextResponse } from "next/server";
import { getClientIp } from "@/lib/getClientIp";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { cronConfigured, isAuthorizedCron } from "@/server/reminders/cronAuth";
import { runReminderSweep } from "@/server/reminders/sweep";

// POST /api/cron/execute, called by an AWS EventBridge rule (API destination).
// EventBridge gives up after 5 seconds, so the sweep runs after the response
// (202). Overlapping or retried calls are safe: the reminder ledger makes every
// reminder idempotent. Add ?wait=1 to run inline and get the summary (manual runs).

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const g = globalThis as unknown as { __ncCronRunning?: boolean };

async function sweep() {
  if (g.__ncCronRunning) return null; // one sweep at a time per instance
  g.__ncCronRunning = true;
  try {
    const r = await runReminderSweep();
    console.log("[CRON] reminders", JSON.stringify(r));
    return r;
  } catch (e) {
    console.error("[CRON] reminder sweep failed:", e instanceof Error ? e.message : e);
    throw e;
  } finally {
    g.__ncCronRunning = false;
  }
}

export async function POST(req: Request) {
  if (!cronConfigured()) return new NextResponse(null, { status: 404 });
  if (!isAuthorizedCron(req.headers.get("authorization"))) {
    const limit = rateLimit(`cron-auth-fail:${getClientIp(req.headers)}`, 10, 60_000);
    if (!limit.allowed) return rateLimitResponse(limit);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const headers = { "Cache-Control": "no-store" };
  if (new URL(req.url).searchParams.get("wait") === "1") {
    try {
      const result = await sweep();
      return NextResponse.json(result ?? { status: "already-running" }, { status: result ? 200 : 202, headers });
    } catch {
      return NextResponse.json({ error: "Sweep failed" }, { status: 500, headers });
    }
  }
  if (g.__ncCronRunning) return NextResponse.json({ status: "already-running" }, { status: 202, headers });
  after(() => sweep().catch(() => {}));
  return NextResponse.json({ status: "accepted" }, { status: 202, headers });
}
