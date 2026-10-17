import { z } from "zod";

// Reusable field schemas for route handlers and server actions. Server actions
// are public HTTP endpoints, so their TypeScript parameter types are not a
// runtime guarantee and every argument is validated with these.

/** Database ids (cuid / uuid). */
export const idSchema = z.string().trim().min(1, "Missing id.").max(64, "Invalid id.");

/** "YYYY-MM-DD" */
export const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD date format.");

/** "HH:MM" 24-hour time */
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use the HH:MM time format.");

export const optionalText = (max: number) => z.string().trim().max(max).optional();

/** Returns the first Zod issue message, for `{ success: false, error }` replies. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input.";
}
