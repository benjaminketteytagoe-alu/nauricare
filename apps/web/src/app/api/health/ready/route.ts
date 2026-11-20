import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

// Readiness probe for uptime monitoring: "can this instance serve real
// traffic?" Unlike /api/health (liveness, used by ECS), it checks the
// database, so an outage pages someone instead of silently serving errors.
// It is never wired to the ECS health check: a DB blip must not make ECS kill
// healthy containers.
export const dynamic = "force-dynamic";

const DB_TIMEOUT_MS = 2_000;

export async function GET() {
  const started = performance.now();
  let database: "ok" | "error" = "ok";
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("database check timed out")), DB_TIMEOUT_MS)),
    ]);
  } catch (err) {
    database = "error";
    logger.error({ event: "health.ready_failed", err }, "Readiness check failed");
  }
  const ok = database === "ok";
  return Response.json(
    {
      status: ok ? "ok" : "degraded",
      version: process.env.APP_VERSION ?? "unknown",
      checks: { database },
      durationMs: Math.round(performance.now() - started),
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
