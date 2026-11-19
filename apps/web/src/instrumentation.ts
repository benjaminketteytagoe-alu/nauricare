import type { Instrumentation } from "next";

// Runs once when each Next.js server starts (see Next.js "instrumentation").
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Tracing is opt-in: set OTEL_EXPORTER_OTLP_ENDPOINT (e.g. an ADOT collector
  // sidecar that forwards to X-Ray) to export Next.js's built-in spans.
  if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    const { registerOTel } = await import("@vercel/otel");
    registerOTel({ serviceName: process.env.OTEL_SERVICE_NAME ?? "nauricare-web" });
  }

  const { logger } = await import("@/lib/logger");
  const { startReminderScheduler, schedulerEnabled } = await import("@/server/reminders/scheduler");
  const { cronConfigured } = await import("@/server/reminders/cronAuth");
  startReminderScheduler();

  logger.info({ event: "server.start", tracing: Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT) }, "Server started");
  if (process.env.NODE_ENV === "production" && !cronConfigured() && !schedulerEnabled()) {
    logger.warn(
      { event: "config.cron_secret_missing" },
      "CRON_SECRET is not set (32+ chars): /api/cron/execute is disabled and no reminders will be sent.",
    );
  }
  if (process.env.NODE_ENV === "production" && !process.env.DATA_ENCRYPTION_KEY) {
    logger.warn(
      { event: "config.data_encryption_key_missing" },
      "DATA_ENCRYPTION_KEY is not set: sealed data falls back to NEXTAUTH_SECRET.",
    );
  }
}

/**
 * Every uncaught server error (Server Components, Route Handlers, Server
 * Actions, proxy) ends up here. It is logged as one structured line with the
 * route *pattern*, never the concrete path or query, which can carry ids or
 * tokens. CloudWatch counts `event = "request.error"` for the error-rate alarm.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logger, requestIdFrom } = await import("@/lib/logger");
  const header = (name: string) => {
    const v = request.headers[name];
    return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
  };
  logger.error(
    {
      event: "request.error",
      err,
      requestId: requestIdFrom({ get: header }),
      method: request.method,
      route: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource,
    },
    "Unhandled server error",
  );
};
