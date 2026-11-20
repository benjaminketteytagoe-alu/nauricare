import type { JWT } from "next-auth/jwt";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prisma = { user: { findUnique: vi.fn(), updateMany: vi.fn() } };
const consumeVerifiedLogin = vi.fn();
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/server/auth/loginCode.service", () => ({ consumeVerifiedLogin }));
vi.mock("@/server/activity/activity.service", () => ({ recordPatientActivity: vi.fn() }));
vi.mock("@next-auth/prisma-adapter", () => ({ PrismaAdapter: () => ({}) }));

const { authOptions } = await import("./route");
const jwt = authOptions.callbacks!.jwt! as unknown as (p: Record<string, unknown>) => Promise<JWT>;
const toSession = authOptions.callbacks!.session! as unknown as (
  p: Record<string, unknown>,
) => Promise<{ user: { id: string }; ended?: string; idleLimitMs?: number | null }>;

const MIN = 60_000;
const dbUser = (role = "PATIENT", passwordHash = "hash-1") => ({
  id: "u1",
  role,
  avatarUrl: null,
  deletedAt: null,
  passwordHash,
});

async function signIn(role = "PATIENT", remember = false) {
  prisma.user.findUnique.mockResolvedValue(dbUser(role));
  let token = await jwt({ token: { email: "a@b.rw" }, user: { id: "u1", role } });
  consumeVerifiedLogin.mockResolvedValue(true);
  token = await jwt({ token, trigger: "update", session: { loginCode: "verified", remember } });
  return token;
}

describe("session lifecycle (NextAuth callbacks)", () => {
  beforeEach(() => {
    vi.stubEnv("DATA_ENCRYPTION_KEY", "unit-test-only:".padEnd(48, "s"));
    vi.useFakeTimers({ now: 1_800_000_000_000 });
  });
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("ends a patient session after 30 idle minutes unless activity is reported", async () => {
    let token = await signIn();
    vi.advanceTimersByTime(20 * MIN);
    token = await jwt({ token, trigger: "update", session: { activity: true } });
    vi.advanceTimersByTime(20 * MIN); // 40 min since sign-in, 20 since activity
    token = await jwt({ token });
    expect(token.ended).toBeUndefined();

    vi.advanceTimersByTime(11 * MIN);
    token = await jwt({ token, trigger: "update", session: { activity: true } }); // too late to revive
    expect(token.ended).toBe("idle");
    const s = await toSession({ session: { user: {} }, token });
    expect(s.user.id).toBe("");
    expect(s.ended).toBe("idle");
  });

  it("keeps a remembered patient signed in while idle, but not staff", async () => {
    let patient = await signIn("PATIENT", true);
    vi.advanceTimersByTime(3 * 24 * 60 * MIN);
    patient = await jwt({ token: patient });
    expect(patient.ended).toBeUndefined();
    expect((await toSession({ session: { user: {} }, token: patient })).idleLimitMs).toBeNull();

    let admin = await signIn("ADMIN", true);
    expect(admin.remember).toBe(false);
    vi.advanceTimersByTime(16 * MIN);
    admin = await jwt({ token: admin });
    expect(admin.ended).toBe("idle");
  });

  it("ends every session when the password changes", async () => {
    let token = await signIn("PATIENT", true);
    prisma.user.findUnique.mockResolvedValue(dbUser("PATIENT", "hash-2"));
    token = await jwt({ token });
    expect(token.ended).toBe("revoked");
    // and it stays ended even if the password were changed back
    prisma.user.findUnique.mockResolvedValue(dbUser("PATIENT", "hash-1"));
    expect((await jwt({ token })).ended).toBe("revoked");
  });

  it("follows role changes from the database without ending the session", async () => {
    let token = await signIn("PROVIDER");
    prisma.user.findUnique.mockResolvedValue(dbUser("ADMIN"));
    token = await jwt({ token });
    expect(token.role).toBe("ADMIN");
    expect(token.ended).toBeUndefined();
  });
});
