import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prisma = { user: { findUnique: vi.fn() } };
vi.mock("@/lib/prisma", () => ({ prisma }));

const { issueSignupTicket, redeemSignupTicket } = await import("./signupTicket");
const { sealJson } = await import("@/server/security/sealing");

const fresh = () => ({
  id: "u1",
  name: "Amina",
  email: "amina@example.com",
  role: "PATIENT",
  isEmailVerified: false,
  deletedAt: null,
  createdAt: new Date(),
});

describe("signup tickets", () => {
  beforeEach(() => vi.stubEnv("DATA_ENCRYPTION_KEY", "unit-test-only:".padEnd(48, "t")));
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("signs in the account it was issued for", async () => {
    prisma.user.findUnique.mockResolvedValue(fresh());
    const user = await redeemSignupTicket(issueSignupTicket("u1"));
    expect(user).toEqual({ id: "u1", name: "Amina", email: "amina@example.com", role: "PATIENT" });
    expect(prisma.user.findUnique.mock.calls[0][0].where).toEqual({ id: "u1" });
  });

  it("rejects tampered, foreign-purpose and expired tickets", async () => {
    prisma.user.findUnique.mockResolvedValue(fresh());
    const ticket = issueSignupTicket("u1");
    expect(await redeemSignupTicket(`${ticket.slice(0, -2)}xx`)).toBeNull();
    expect(await redeemSignupTicket(sealJson("other", { uid: "u1", exp: Date.now() + 60_000 }))).toBeNull();

    vi.useFakeTimers({ now: Date.now() + 11 * 60_000 });
    expect(await redeemSignupTicket(ticket)).toBeNull();
  });

  it("stops working once the email is verified, the account is deleted or old", async () => {
    const ticket = issueSignupTicket("u1");
    prisma.user.findUnique.mockResolvedValueOnce({ ...fresh(), isEmailVerified: true });
    expect(await redeemSignupTicket(ticket)).toBeNull();
    prisma.user.findUnique.mockResolvedValueOnce({ ...fresh(), deletedAt: new Date() });
    expect(await redeemSignupTicket(ticket)).toBeNull();
    prisma.user.findUnique.mockResolvedValueOnce({ ...fresh(), createdAt: new Date(Date.now() - 3_600_000) });
    expect(await redeemSignupTicket(ticket)).toBeNull();
    prisma.user.findUnique.mockResolvedValueOnce(null);
    expect(await redeemSignupTicket(ticket)).toBeNull();
  });
});
