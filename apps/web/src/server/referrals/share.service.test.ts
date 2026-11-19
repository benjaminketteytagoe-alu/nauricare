import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaMock } from "../../../test/prismaMock";

const { notify, recordActivity } = vi.hoisted(() => ({ notify: vi.fn(), recordActivity: vi.fn() }));
vi.mock("@/lib/prisma", async () => ({ prisma: (await import("../../../test/prismaMock")).createPrismaMock() }));
vi.mock("@/server/notifications/notify", () => ({ notify }));
vi.mock("@/server/activity/activity.service", () => ({ recordActivity }));

const mock = (await import("@/lib/prisma")).prisma as unknown as PrismaMock;
const { createShare, listShares, revokeShare, unlockShare } = await import("./share.service");
const { hashToken, openJson, sealJson } = await import("@/server/security/sealing");

const referral = {
  id: "ref1",
  referralCode: "NC-7KQ2",
  status: "PENDING",
  createdAt: new Date("2026-11-01T10:00:00Z"),
  specialtyRequired: "Obstetrics & Gynecology",
  clinicalReason: "Heavy bleeding for three cycles.",
  triageSeverity: "MODERATE",
  insuranceSnapshot: { provider: "RSSB_RAMA" },
  hospital: { name: "CHUK", address: "KN 4 Ave", district: "Nyarugenge" },
  patient: {
    name: "Amina Uwase",
    dateOfBirth: new Date("1995-04-02T00:00:00Z"),
    email: "amina@example.com",
    phoneNumber: "+250788000000",
    country: "Rwanda",
    patientProfile: { country: "Rwanda", emergencyContact: "Mum" },
  },
};
const meta = { ip: "1.2.3.4", userAgent: "jest" };
const TOKEN = "t".repeat(43);

describe("referral sharing", () => {
  beforeEach(() => vi.stubEnv("DATA_ENCRYPTION_KEY", "unit-test-only:".padEnd(48, "e")));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetAllMocks();
  });

  describe("createShare", () => {
    it("stores only the token hash and an encrypted snapshot", async () => {
      mock.referral.findFirst.mockResolvedValue(referral);
      mock.referralShare.count.mockResolvedValue(0);
      mock.referralShare.create.mockImplementation(async ({ data }) => ({ id: "s1", expiresAt: data.expiresAt }));

      const share = await createShare("p1", "ref1", 7);
      const token = share.url.split("/r/")[1];
      const { data } = mock.referralShare.create.mock.calls[0][0];
      expect(data.tokenHash).toBe(hashToken(token));
      expect(data.encryptedPayload).not.toContain("Amina");
      expect(
        openJson<{ patient: { fullName: string } }>("referral-share", data.encryptedPayload)?.patient.fullName,
      ).toBe("Amina Uwase");
      expect(share.expiresAt.getTime() - Date.now()).toBeGreaterThan(6.9 * 86_400_000);
      expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({ type: "REFERRAL_SHARED" }));
    });

    it("refuses other patients' referrals, closed referrals and a fourth active link", async () => {
      mock.referral.findFirst.mockResolvedValue(null);
      await expect(createShare("p2", "ref1", 7)).rejects.toMatchObject({ status: 404 });
      mock.referral.findFirst.mockResolvedValue({ ...referral, status: "COMPLETED" });
      await expect(createShare("p1", "ref1", 7)).rejects.toThrow(/closed/);
      mock.referral.findFirst.mockResolvedValue(referral);
      mock.referralShare.count.mockResolvedValue(3);
      await expect(createShare("p1", "ref1", 7)).rejects.toMatchObject({ status: 409 });
    });
  });

  it("labels shares as active, expired or revoked", async () => {
    mock.referral.findFirst.mockResolvedValue(referral);
    const future = new Date(Date.now() + 1e6);
    mock.referralShare.findMany.mockResolvedValue([
      { id: "a", expiresAt: future, revokedAt: null },
      { id: "b", expiresAt: new Date(Date.now() - 1e6), revokedAt: null },
      { id: "c", expiresAt: future, revokedAt: new Date() },
    ]);
    expect((await listShares("p1", "ref1")).map((s) => s.state)).toEqual(["active", "expired", "revoked"]);
  });

  it("revokes once and only for the owner", async () => {
    mock.referralShare.findFirst.mockResolvedValue(null);
    await expect(revokeShare("p2", "s1")).rejects.toMatchObject({ status: 404 });
    mock.referralShare.findFirst.mockResolvedValue({ id: "s1", revokedAt: new Date(), referral });
    await revokeShare("p1", "s1");
    expect(mock.referralShare.update).not.toHaveBeenCalled();
    mock.referralShare.findFirst.mockResolvedValue({ id: "s1", revokedAt: null, referral });
    await revokeShare("p1", "s1");
    expect(mock.referralShare.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { revokedAt: expect.any(Date) } }),
    );
  });

  describe("unlockShare", () => {
    const stored = (over: object = {}) => ({
      id: "s1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 1e6),
      failedAttempts: 0,
      encryptedPayload: sealJson("referral-share", { version: 1, patient: { fullName: "Amina Uwase" } }),
      referral: { id: "ref1", referralCode: "NC-7KQ2", patientId: "p1", hospital: { name: "CHUK" } },
      ...over,
    });

    it("rejects malformed, unknown, revoked and expired links", async () => {
      await expect(unlockShare("short", "NC-7KQ2", meta)).rejects.toMatchObject({ status: 404 });
      expect(mock.referralShare.findUnique).not.toHaveBeenCalled();
      mock.referralShare.findUnique.mockResolvedValue(null);
      await expect(unlockShare(TOKEN, "NC-7KQ2", meta)).rejects.toMatchObject({ status: 404 });
      mock.referralShare.findUnique.mockResolvedValue(stored({ revokedAt: new Date() }));
      await expect(unlockShare(TOKEN, "NC-7KQ2", meta)).rejects.toMatchObject({ status: 410 });
      mock.referralShare.findUnique.mockResolvedValue(stored({ expiresAt: new Date(Date.now() - 1) }));
      await expect(unlockShare(TOKEN, "NC-7KQ2", meta)).rejects.toMatchObject({ status: 410 });
    });

    it("logs wrong codes and locks the link at the tenth", async () => {
      mock.referralShare.findUnique.mockResolvedValue(stored());
      await expect(unlockShare(TOKEN, "NC-0000", meta)).rejects.toMatchObject({ status: 401 });
      expect(mock.referralShareAccess.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ success: false, ipAddress: "1.2.3.4" }),
      });

      mock.referralShare.findUnique.mockResolvedValue(stored({ failedAttempts: 9 }));
      await expect(unlockShare(TOKEN, "NC-0000", meta)).rejects.toMatchObject({ status: 423 });
      expect(mock.referralShare.update.mock.calls.at(-1)![0].data).toMatchObject({
        failedAttempts: 10,
        revokedAt: expect.any(Date),
      });
    });

    it("releases the snapshot for the right code (case-insensitive) and tells the patient", async () => {
      mock.referralShare.findUnique.mockResolvedValue(stored());
      const payload = await unlockShare(TOKEN, " nc-7kq2 ", meta);
      expect(payload.patient.fullName).toBe("Amina Uwase");
      expect(notify).toHaveBeenCalledWith(expect.objectContaining({ recipientId: "p1", type: "REFERRAL_UPDATE" }));
      expect(mock.referralShareAccess.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ success: true }),
      });
    });

    it("fails closed when the snapshot cannot be decrypted", async () => {
      mock.referralShare.findUnique.mockResolvedValue(stored({ encryptedPayload: "tampered" }));
      await expect(unlockShare(TOKEN, "NC-7KQ2", meta)).rejects.toMatchObject({ status: 500 });
    });
  });
});
