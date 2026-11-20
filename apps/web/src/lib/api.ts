import { NextResponse } from "next/server";
import { ZodError, type z } from "zod";
import { logger } from "@/lib/logger";

// Uniform JSON envelope for route handlers. Success bodies are the data
// object itself (keeps existing clients working); errors are always
// `{ error, code? }` with the right HTTP status.

export function apiSuccess<T>(data: T, status = 200, headers?: HeadersInit): NextResponse {
  return NextResponse.json(data, { status, headers });
}

export function apiError(message: string, status = 400, code?: string): NextResponse {
  return NextResponse.json(code ? { error: message, code } : { error: message }, { status });
}

export const unauthorized = () => apiError("Unauthorized", 401);
export const forbidden = (message = "Forbidden") => apiError(message, 403);
export const notFound = (message = "Not found") => apiError(message, 404);
export const validationError = (message: string) => apiError(message, 400);

export type Parsed<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

/** Reads a JSON body without validating it; `undefined` when it is missing or malformed. */
export async function readJson(req: Request): Promise<unknown> {
  return req.json().catch(() => undefined);
}

/**
 * Validates an already-read body. Use with `readJson` when something must
 * happen between reading and validating (e.g. Turnstile before any parsing).
 * `message` replaces Zod's first issue for forms that show one generic error.
 */
export function validateBody<S extends z.ZodType>(body: unknown, schema: S, message?: string): Parsed<z.infer<S>> {
  if (body === undefined) return { ok: false, response: apiError("Request body must be valid JSON.", 400) };
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: apiError(message ?? parsed.error.issues[0]?.message ?? "Invalid request body.", 400),
    };
  }
  return { ok: true, data: parsed.data };
}

/** Reads and validates a JSON body. Malformed JSON is treated like an invalid payload. */
export async function parseJson<S extends z.ZodType>(
  req: Request,
  schema: S,
  message?: string,
): Promise<Parsed<z.infer<S>>> {
  return validateBody(await readJson(req), schema, message);
}

/** Error a service can throw to choose the HTTP status and user-facing message. */
export class ServiceError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code?: string,
  ) {
    super(message);
  }
}

/** Runs a route body, mapping ServiceError (or anything with .status) to a JSON error. */
export async function handle(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ZodError) return apiError(e.issues[0]?.message ?? "Invalid request.", 400);
    if (e instanceof Error && typeof (e as { status?: unknown }).status === "number") {
      return apiError(e.message, (e as unknown as { status: number }).status, (e as { code?: string }).code);
    }
    logger.error({ event: "api.unhandled_error", err: e }, "Unhandled error in route handler");
    return apiError("Something went wrong. Please try again.", 500);
  }
}
