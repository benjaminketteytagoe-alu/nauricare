import { afterEach, describe, expect, it, vi } from "vitest";
import { enforceRateLimit, rateLimit } from "./rateLimit";

describe("rateLimit", () => {
  afterEach(() => vi.useRealTimers());

  it("allows `limit` requests per window, then refuses until the window resets", () => {
    vi.useFakeTimers();
    const key = `t-${Math.random()}`;
    expect([1, 2, 3].map(() => rateLimit(key, 3, 1000).allowed)).toEqual([true, true, true]);
    const blocked = rateLimit(key, 3, 1000);
    expect(blocked).toMatchObject({ allowed: false, remaining: 0 });
    vi.advanceTimersByTime(1001);
    expect(rateLimit(key, 3, 1000)).toMatchObject({ allowed: true, remaining: 2 });
  });

  it("keeps keys independent", () => {
    const a = `a-${Math.random()}`;
    rateLimit(a, 1, 60_000);
    expect(rateLimit(a, 1, 60_000).allowed).toBe(false);
    expect(rateLimit(`b-${Math.random()}`, 1, 60_000).allowed).toBe(true);
  });

  it("enforceRateLimit returns a 429 with Retry-After once exhausted", async () => {
    const key = `e-${Math.random()}`;
    expect(enforceRateLimit(key, 1, 30_000)).toBeNull();
    const res = enforceRateLimit(key, 1, 30_000);
    expect(res?.status).toBe(429);
    expect(Number(res?.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(await res?.json()).toEqual({ error: "Too many requests. Please try again shortly." });
  });
});
