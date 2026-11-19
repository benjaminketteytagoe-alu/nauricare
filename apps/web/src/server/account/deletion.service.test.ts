import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaMock } from "../../../test/prismaMock";

const { notify, logAdministrativeAction } = vi.hoisted(() => ({ notify: vi.fn(), logAdministrativeAction: vi.fn() }));
vi.mock("@/lib/prisma", async () => ({ prisma: (await import("../../../test/prismaMock")).createPrismaMock() }));
vi.mock("@/server/notifications/notify", () => ({ notify }));
vi.mock("@/lib/audit", () => ({ logAdministrativeAction }));

const mock = (await import("@/lib/prisma")).prisma as unknown as PrismaMock;
const { DELETED_NAME, deletePatientAccount, deletionPhrase, getDeletionPhrase } = await import("./deletion.service");

const patient = {
  id: "u1",
  handle: "amina",
  email: "amina@example.com",
  role: "PATIENT",
  deletedAt: null,
  patientProfile: { id: "pp1" },
};

describe("account deletion", () => {
  afterEach(() => vi.resetAllMocks());

  it("asks for the handle, or the email when there is none", async () => {
    expect(deletionPhrase({ handle: null, email: "a@b.rw" })).toBe("a@b.rw");
    mock.user.findUnique.mockResolvedValue(patient);
    expect(await getDeletionPhrase("u1")).toBe("amina");
  });

  it("refuses providers, admins, missing and already-deleted accounts", async () => {
    mock.user.findUnique.mockResolvedValue({ ...patient, role: "PROVIDER" });
    await expect(getDeletionPhrase("u1")).rejects.toMatchObject({ status: 403 });
    await expect(deletePatientAccount("u1", "amina")).rejects.toMatchObject({ status: 403 });
    mock.user.findUnique.mockResolvedValue({ ...patient, deletedAt: new Date() });
    await expect(deletePatientAccount("u1", "amina")).rejects.toMatchObject({ status: 404 });
  });

  it("requires the exact confirmation phrase (case-insensitive)", async () => {
    mock.user.findUnique.mockResolvedValue(patient);
    await expect(deletePatientAccount("u1", "amina2")).rejects.toMatchObject({ status: 400 });
    expect(mock.user.update).not.toHaveBeenCalled();
  });

  it("anonymises identity, removes sign-in methods, cancels upcoming visits and audits", async () => {
    mock.user.findUnique.mockResolvedValue(patient);
    mock.appointment.findMany.mockResolvedValue([
      { id: "a1", startTime: new Date(Date.now() + 1e7), practitioner: { userId: "doc1" } },
    ]);
    await deletePatientAccount("u1", "  AMINA ", "1.2.3.4");

    const { data } = mock.user.update.mock.calls[0][0];
    expect(data).toMatchObject({
      name: DELETED_NAME,
      email: "deleted-u1@deleted.nauricare.invalid",
      handle: null,
      phoneNumber: null,
      dateOfBirth: null,
      passwordHash: "",
      deletedAt: expect.any(Date),
    });
    for (const model of ["account", "session", "resetToken", "emailVerificationToken", "follow", "patientInsurance"]) {
      expect(mock[model].deleteMany, model).toHaveBeenCalled();
    }
    expect(mock.referralShare.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { revokedAt: expect.any(Date) } }),
    );
    expect(mock.appointment.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["a1"] } },
      data: { status: "CANCELLED" },
    });
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ recipientId: "doc1" }));
    expect(logAdministrativeAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ACCOUNT_DELETED",
        ipAddress: "1.2.3.4",
        details: { cancelledAppointments: 1 },
      }),
    );
  });
});
