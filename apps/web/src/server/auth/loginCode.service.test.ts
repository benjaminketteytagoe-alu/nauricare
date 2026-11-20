import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
  user: { findUnique: vi.fn(), updateMany: vi.fn() },
  loginChallenge: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(),
};
const sendLoginCodeEmail = vi.fn();
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/email", () => ({ sendLoginCodeEmail }));

const { consumeVerifiedLogin, maskEmail, MAX_ATTEMPTS, sendLoginCode, verifyLoginCode } =
  await import("./loginCode.service");
const { keyedHash } = await import("@/server/security/sealing");

const user = { email: "amina@example.com", name: "Amina Uwase", deletedAt: null };

describe("loginCode.service", () => {
  beforeEach(() => {
    vi.stubEnv("DATA_ENCRYPTION_KEY", "unit-test-only:".padEnd(48, "c"));
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma));
    prisma.loginChallenge.create.mockResolvedValue({ id: "c1" });
    prisma.loginChallenge.update.mockImplementation(async ({ data }: { data: object }) => ({ id: "c1", ...data }));
  });
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("masks emails", () => {
    expect(maskEmail("amina@example.com")).toBe("am•••@example.com");
    expect(maskEmail("ab@x.rw")).toBe("ab•@x.rw");
    expect(maskEmail("broken")).toBe("your email");
  });

  describe("sendLoginCode", () => {
    it("stores only an HMAC of a 6-digit code and emails the code", async () => {
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.loginChallenge.findMany.mockResolvedValue([]);
      const r = await sendLoginCode("u1", "sid", "1.2.3.4");
      expect(r.maskedEmail).toBe("am•••@example.com");

      const { code } = sendLoginCodeEmail.mock.calls[0][0] as { code: string };
      expect(code).toMatch(/^\d{6}$/);
      const stored = prisma.loginChallenge.update.mock.calls.at(-1)![0].data.codeHash as string;
      expect(stored).toBe(keyedHash("login-code", `c1:${code}`));
      expect(stored).not.toContain(code);
      // earlier unused codes for this session are expired first
      expect(prisma.loginChallenge.updateMany).toHaveBeenCalled();
    });

    it("refuses deleted accounts, enforces the per-session cooldown and the hourly cap", async () => {
      prisma.user.findUnique.mockResolvedValue({ ...user, deletedAt: new Date() });
      await expect(sendLoginCode("u1", "sid")).rejects.toMatchObject({ status: 404 });

      prisma.user.findUnique.mockResolvedValue(user);
      const { hashToken } = await import("@/server/security/sealing");
      prisma.loginChallenge.findMany.mockResolvedValue([
        { createdAt: new Date(), sessionKeyHash: hashToken("login-session:sid") },
      ]);
      await expect(sendLoginCode("u1", "sid")).rejects.toMatchObject({ status: 429 });

      prisma.loginChallenge.findMany.mockResolvedValue(
        Array.from({ length: 10 }, () => ({ createdAt: new Date(Date.now() - 600_000), sessionKeyHash: "other" })),
      );
      await expect(sendLoginCode("u1", "sid")).rejects.toThrow(/Too many codes/);
    });

    it("expires the code and reports 502 when the email cannot be sent", async () => {
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.loginChallenge.findMany.mockResolvedValue([]);
      sendLoginCodeEmail.mockRejectedValue(new Error("resend down"));
      await expect(sendLoginCode("u1", "sid")).rejects.toMatchObject({ status: 502 });
      expect(prisma.loginChallenge.update.mock.calls.at(-1)![0].data).toHaveProperty("expiresAt");
    });
  });

  describe("verifyLoginCode", () => {
    const challenge = (code: string, attempts = 0) => ({
      id: "c1",
      attempts,
      codeHash: keyedHash("login-code", `c1:${code}`),
    });

    it("rejects malformed codes without touching the database", async () => {
      await expect(verifyLoginCode("u1", "sid", "12ab56")).rejects.toMatchObject({ status: 400 });
      expect(prisma.loginChallenge.findFirst).not.toHaveBeenCalled();
    });

    it("reports expired or missing challenges as 410", async () => {
      prisma.loginChallenge.findFirst.mockResolvedValue(null);
      await expect(verifyLoginCode("u1", "sid", "123456")).rejects.toMatchObject({ status: 410 });
    });

    it("counts wrong attempts and locks out at the limit", async () => {
      prisma.loginChallenge.findFirst.mockResolvedValue(challenge("111111"));
      prisma.loginChallenge.update.mockResolvedValue({ attempts: 1 });
      await expect(verifyLoginCode("u1", "sid", "222222")).rejects.toThrow(`${MAX_ATTEMPTS - 1} attempts left`);
      prisma.loginChallenge.update.mockResolvedValue({ attempts: MAX_ATTEMPTS });
      await expect(verifyLoginCode("u1", "sid", "222222")).rejects.toMatchObject({ status: 429 });
    });

    it("accepts the right code exactly once", async () => {
      prisma.loginChallenge.findFirst.mockResolvedValue(challenge("654321"));
      prisma.loginChallenge.updateMany.mockResolvedValue({ count: 1 });
      await expect(verifyLoginCode("u1", "sid", "654321")).resolves.toBeUndefined();
      // the code proves the inbox, so the email becomes verified
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: "u1", isEmailVerified: false },
        data: { isEmailVerified: true },
      });
      prisma.user.updateMany.mockClear();
      prisma.loginChallenge.updateMany.mockResolvedValue({ count: 0 });
      await expect(verifyLoginCode("u1", "sid", "654321")).rejects.toThrow(/already been used/);
    });
  });

  it("consumes a verified challenge only once", async () => {
    prisma.loginChallenge.findFirst.mockResolvedValue(null);
    expect(await consumeVerifiedLogin("u1", "sid")).toBe(false);
    prisma.loginChallenge.findFirst.mockResolvedValue({ id: "c1" });
    prisma.loginChallenge.updateMany.mockResolvedValue({ count: 1 });
    expect(await consumeVerifiedLogin("u1", "sid")).toBe(true);
    prisma.loginChallenge.updateMany.mockResolvedValue({ count: 0 });
    expect(await consumeVerifiedLogin("u1", "sid")).toBe(false);
  });
});
