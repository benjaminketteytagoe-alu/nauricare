import { describe, expect, it } from "vitest";
import { z } from "zod";
import { dateKeySchema, firstIssue, idSchema, optionalText, timeSchema } from "./common";
import { passwordField } from "./password";

describe("shared field schemas", () => {
  it("validates ids, date keys and times", () => {
    expect(idSchema.parse("  ck123 ")).toBe("ck123");
    expect(idSchema.safeParse("").success).toBe(false);
    expect(idSchema.safeParse("x".repeat(65)).success).toBe(false);
    expect(dateKeySchema.safeParse("2026-11-19").success).toBe(true);
    expect(dateKeySchema.safeParse("19/11/2026").success).toBe(false);
    expect(timeSchema.safeParse("23:59").success).toBe(true);
    expect(timeSchema.safeParse("24:00").success).toBe(false);
    expect(optionalText(3).safeParse(" abcd ").success).toBe(false);
  });

  it("enforces the password rule", () => {
    expect(passwordField.safeParse("short1!").success).toBe(false);
    expect(passwordField.safeParse("longenough").success).toBe(false);
    expect(passwordField.safeParse("longenough1!").success).toBe(true);
  });

  it("returns the first issue message", () => {
    const r = z.object({ a: z.string({ error: "A is required." }) }).safeParse({});
    expect(!r.success && firstIssue(r.error)).toBe("A is required.");
  });
});
