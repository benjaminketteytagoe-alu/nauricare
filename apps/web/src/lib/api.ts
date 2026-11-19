import { NextResponse } from "next/server";
import { ZodError, type z } from "zod";

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

/** Reads and validates a JSON body. Malformed JSON is treated like an invalid payload. */
export async function parseJson<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: NextResponse }> {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return { ok: false, response: apiError("Request body must be valid JSON.", 400) };
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, response: apiError(parsed.error.issues[0]?.message ?? "Invalid request body.", 400) };
  }
  return { ok: true, data: parsed.data };
}

/** Error a service can throw to choose the HTTP status and user-facing message. */
export class ServiceError extends Error {
  constructor(message: string, public status = 400, public code?: string) {
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
    console.error("[API]", e);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
