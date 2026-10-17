import { NextResponse } from "next/server";
import type { z } from "zod";

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
