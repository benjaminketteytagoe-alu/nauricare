import "server-only";
import pino, { type DestinationStream, type Logger } from "pino";

/**
 * Structured JSON logger for server code (one line per event on stdout, which
 * ECS ships to CloudWatch Logs). CloudWatch metric filters and alarms key off
 * the `level` and `event` fields, so keep them stable.
 *
 * Privacy: NauriCare handles reproductive-health data. Never log request
 * bodies, health records or free text. The redaction list below is a safety
 * net, not permission: log ids and outcomes, not content.
 */

/** Keys whose values are always replaced, at any depth we can express. */
const SENSITIVE_KEYS = [
  // credentials and tokens
  "password",
  "passwordHash",
  "newPassword",
  "currentPassword",
  "token",
  "rawToken",
  "accessToken",
  "refreshToken",
  "idToken",
  "secret",
  "apiKey",
  "authorization",
  "cookie",
  "set-cookie",
  "turnstileToken",
  "code",
  // personal identifiers
  "email",
  "phone",
  "phoneNumber",
  "name",
  "firstName",
  "lastName",
  "dateOfBirth",
  "address",
  "ip",
  "ipAddress",
  // health content
  "notes",
  "note",
  "symptoms",
  "content",
  "body",
  "medications",
  "diagnosis",
  "value",
];

const REDACT_PATHS = SENSITIVE_KEYS.flatMap((k) => {
  const key = /^[A-Za-z_$][\w$]*$/.test(k) ? k : `["${k}"]`;
  const dot = key.startsWith("[") ? "" : ".";
  return [key, `*${dot}${key}`, `*.*${dot}${key}`, `req.headers${dot}${key}`];
});

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/** Scrubs e-mail addresses out of free-form strings (error messages, paths). */
export function scrubText(text: string): string {
  return text.replace(EMAIL_RE, "[email]");
}

function serializeError(err: unknown) {
  if (!(err instanceof Error)) return { message: scrubText(String(err)) };
  const out: Record<string, unknown> = {
    type: err.name,
    message: scrubText(err.message),
    stack: err.stack ? scrubText(err.stack) : undefined,
  };
  const digest = (err as { digest?: unknown }).digest;
  if (digest !== undefined) out.digest = String(digest);
  const code = (err as { code?: unknown }).code;
  if (typeof code === "string") out.errorCode = code; // e.g. Prisma P2002
  return out;
}

/** Builds a logger with the app's options. Exported for tests (pass a capture stream). */
export function createLogger(destination?: DestinationStream, level?: string): Logger {
  const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
  const options: pino.LoggerOptions = {
    level:
      level ?? process.env.LOG_LEVEL ?? (isTest ? "silent" : process.env.NODE_ENV === "production" ? "info" : "debug"),
    base: {
      service: "nauricare-web",
      env: process.env.APP_ENV ?? process.env.NODE_ENV,
      version: process.env.APP_VERSION ?? "unknown",
    },
    messageKey: "msg",
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: { level: (label, number) => ({ level: number, severity: label }) },
    serializers: { err: serializeError, error: serializeError },
    redact: { paths: REDACT_PATHS, censor: "[redacted]" },
  };
  return destination ? pino(options, destination) : pino(options);
}

const globalForLogger = globalThis as unknown as { __nauricareLogger?: Logger };

export const logger: Logger = globalForLogger.__nauricareLogger ?? createLogger();
if (process.env.NODE_ENV !== "production") globalForLogger.__nauricareLogger = logger;

type HeaderReader = { get(name: string): string | null };

/**
 * Correlation id for a request: an upstream `x-request-id` when present, else
 * Cloudflare's `cf-ray` (set on every proxied request, and searchable in the
 * Cloudflare dashboard).
 */
export function requestIdFrom(headers: HeaderReader): string | undefined {
  return headers.get("x-request-id") ?? headers.get("cf-ray") ?? undefined;
}
