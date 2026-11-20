import { afterEach, describe, expect, it, vi } from "vitest";
import { cronConfigured, isAuthorizedCron } from "./cronAuth";

const SECRET = "s".repeat(40);
const PREVIOUS = "p".repeat(40);

describe("cronAuth", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is disabled until a 32+ character secret is set", () => {
    vi.stubEnv("CRON_SECRET", "too-short");
    expect(cronConfigured()).toBe(false);
    expect(isAuthorizedCron("too-short")).toBe(false);
    vi.stubEnv("CRON_SECRET", SECRET);
    expect(cronConfigured()).toBe(true);
  });

  it("accepts the raw secret or a bearer token", () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    expect(isAuthorizedCron(SECRET)).toBe(true);
    expect(isAuthorizedCron(`Bearer ${SECRET}`)).toBe(true);
  });

  it("rejects missing or wrong secrets", () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    expect(isAuthorizedCron(null)).toBe(false);
    expect(isAuthorizedCron("")).toBe(false);
    expect(isAuthorizedCron(`${SECRET}x`)).toBe(false);
    expect(isAuthorizedCron(`Basic ${SECRET}`)).toBe(false);
  });

  it("accepts the previous secret during rotation only when it is long enough", () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    vi.stubEnv("CRON_SECRET_PREVIOUS", PREVIOUS);
    expect(isAuthorizedCron(PREVIOUS)).toBe(true);
    vi.stubEnv("CRON_SECRET_PREVIOUS", "short");
    expect(isAuthorizedCron("short")).toBe(false);
  });
});
