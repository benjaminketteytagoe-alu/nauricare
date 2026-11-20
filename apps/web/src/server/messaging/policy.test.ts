import { afterEach, describe, expect, it, vi } from "vitest";

const prisma = {
  user: { findUnique: vi.fn() },
  directMessage: { findFirst: vi.fn() },
  appointment: { findFirst: vi.fn() },
};
vi.mock("@/lib/prisma", () => ({ prisma }));
const { canMessage, isOnline } = await import("./policy");

type UserRow = {
  role: string;
  isVerified?: boolean;
  practitionerProfile?: object | null;
  patientProfile?: object | null;
} | null;
function users(sender: UserRow, receiver: UserRow) {
  prisma.user.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) =>
    where.id === "s" ? sender : receiver,
  );
}

describe("messaging policy", () => {
  afterEach(() => vi.resetAllMocks());

  it("never allows messaging yourself or unknown users", async () => {
    expect(await canMessage("s", "s")).toMatchObject({ allowed: false });
    users(null, { role: "PROVIDER" });
    expect(await canMessage("s", "r")).toMatchObject({ allowed: false });
  });

  it("lets patients message verified, active providers only", async () => {
    users(
      { role: "PATIENT" },
      { role: "PROVIDER", practitionerProfile: { id: "p", isVerified: true, isActive: true } },
    );
    expect(await canMessage("s", "r")).toEqual({ allowed: true });
    users(
      { role: "PATIENT" },
      { role: "PROVIDER", practitionerProfile: { id: "p", isVerified: false, isActive: true } },
    );
    expect(await canMessage("s", "r")).toMatchObject({ allowed: false });
  });

  it("never lets a provider awaiting approval message patients", async () => {
    users(
      { role: "PROVIDER", practitionerProfile: { isVerified: false } },
      { role: "PATIENT", patientProfile: { id: "pp" } },
    );
    prisma.directMessage.findFirst.mockResolvedValue({ id: "m" });
    prisma.appointment.findFirst.mockResolvedValue({ id: "a" });
    expect(await canMessage("s", "r")).toMatchObject({ allowed: false, reason: expect.stringMatching(/verification/) });
  });

  it("stops providers cold-messaging patients", async () => {
    users({ role: "PROVIDER", isVerified: true }, { role: "PATIENT", patientProfile: { id: "pp" } });
    prisma.directMessage.findFirst.mockResolvedValue(null);
    prisma.appointment.findFirst.mockResolvedValue(null);
    expect(await canMessage("s", "r")).toMatchObject({ allowed: false });

    prisma.appointment.findFirst.mockResolvedValue({ id: "a" });
    expect(await canMessage("s", "r")).toEqual({ allowed: true });

    prisma.appointment.findFirst.mockResolvedValue(null);
    prisma.directMessage.findFirst.mockResolvedValue({ id: "m" });
    expect(await canMessage("s", "r")).toEqual({ allowed: true });
  });

  it("refuses patient-to-patient and admin messaging", async () => {
    users({ role: "PATIENT" }, { role: "PATIENT" });
    expect(await canMessage("s", "r")).toMatchObject({ allowed: false });
    users({ role: "ADMIN" }, { role: "PATIENT" });
    expect(await canMessage("s", "r")).toMatchObject({ allowed: false });
  });

  it("counts users seen in the last 90 seconds as online", () => {
    expect(isOnline(new Date(Date.now() - 30_000))).toBe(true);
    expect(isOnline(new Date(Date.now() - 120_000))).toBe(false);
    expect(isOnline(null)).toBe(false);
  });
});
