import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseDateKey } from "@/lib/cycleDates";
import type { PrismaMock } from "../../../test/prismaMock";

const { sendReminderEmail, notifyOrThrow } = vi.hoisted(() => ({
  sendReminderEmail: vi.fn(),
  notifyOrThrow: vi.fn(),
}));
vi.mock("@/lib/prisma", async () => ({ prisma: (await import("../../../test/prismaMock")).createPrismaMock() }));
vi.mock("@/lib/email", () => ({ sendReminderEmail }));
vi.mock("@/server/notifications/notify", () => ({ notifyOrThrow }));

const mock = (await import("@/lib/prisma")).prisma as unknown as PrismaMock;
const { runReminderSweep } = await import("./sweep");

// Monday 16 Nov 2026, 19:00 in Kigali (UTC+2).
const NOW = new Date("2026-11-16T17:00:00Z");
const user = { name: "Amina Uwase", email: "amina@example.com" };

function prefsQuery(rows: { daily?: object[]; weekly?: object[] }) {
  mock.reminderPreference.findMany.mockImplementation(async ({ where }: { where: Record<string, unknown> }) =>
    where.dailyLogReminders ? (rows.daily ?? []) : (rows.weekly ?? []),
  );
}

describe("runReminderSweep", () => {
  beforeEach(() => {
    mock.patientProfile.findMany.mockResolvedValue([]);
    mock.appointment.findMany.mockResolvedValue([]);
    prefsQuery({});
    mock.auditEvent.create.mockResolvedValue({});
    mock.reminderDispatch.create.mockImplementation(async ({ data }: { data: { dedupeKey: string } }) => ({
      id: `d-${data.dedupeKey}`,
      dedupeKey: data.dedupeKey,
      notifiedAt: null,
      emailedAt: null,
    }));
    mock.reminderDispatch.update.mockResolvedValue({});
  });
  afterEach(() => vi.resetAllMocks());

  it("does nothing on an empty database but still records a heartbeat", async () => {
    const r = await runReminderSweep(NOW);
    expect(r).toMatchObject({ period: 0, daily: 0, weekly: 0, appointments: 0, failed: 0 });
    expect(mock.auditEvent.create).toHaveBeenCalledWith({
      data: { action: "CRON_REMINDERS_RUN", details: expect.objectContaining({ at: NOW.toISOString() }) },
    });
  });

  it("sends a period reminder inside the lead window, once per predicted start", async () => {
    mock.patientProfile.findMany.mockResolvedValue([
      {
        id: "pp1",
        userId: "u1",
        menstrualCycle: "28",
        user: { ...user, reminderPreference: null },
        // last period 2026-10-20 -> next predicted 2026-11-17 (tomorrow)
        cycleLogs: [{ startDate: parseDateKey("2026-10-20"), endDate: null }],
      },
    ]);
    const r = await runReminderSweep(NOW);
    expect(r.period).toBe(1);
    expect(mock.reminderDispatch.create.mock.calls[0][0].data.dedupeKey).toBe("period:u1:2026-11-17");
    expect(notifyOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Your period is predicted to start tomorrow", type: "PERIOD_REMINDER" }),
    );
    expect(sendReminderEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "amina@example.com",
        name: "Amina",
        idempotencyKey: "reminder/period:u1:2026-11-17",
      }),
    );
  });

  it("skips period reminders outside the window, before 08:00 local, or without email when disabled", async () => {
    const profile = (startDate: string, prefs: object | null = null) => ({
      id: "pp",
      userId: "u",
      menstrualCycle: "28",
      user: { ...user, reminderPreference: prefs },
      cycleLogs: [{ startDate: parseDateKey(startDate), endDate: null }],
    });
    mock.patientProfile.findMany.mockResolvedValue([profile("2026-10-01")]); // next start long past
    expect((await runReminderSweep(NOW)).period).toBe(0);

    mock.patientProfile.findMany.mockResolvedValue([profile("2026-10-20")]);
    expect((await runReminderSweep(new Date("2026-11-16T04:00:00Z"))).period).toBe(0); // 06:00 Kigali

    mock.patientProfile.findMany.mockResolvedValue([
      profile("2026-10-20", { periodLeadDays: 2, timezone: "Africa/Kigali", emailEnabled: false }),
    ]);
    expect((await runReminderSweep(NOW)).period).toBe(1);
    expect(sendReminderEmail).not.toHaveBeenCalled();
  });

  it("does not repeat a reminder the ledger has already claimed", async () => {
    mock.patientProfile.findMany.mockResolvedValue([
      {
        id: "pp1",
        userId: "u1",
        menstrualCycle: "28",
        user: { ...user, reminderPreference: null },
        cycleLogs: [{ startDate: parseDateKey("2026-10-20"), endDate: null }],
      },
    ]);
    const { Prisma } = await import("@prisma/client");
    mock.reminderDispatch.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "test" }),
    );
    mock.reminderDispatch.updateMany.mockResolvedValue({ count: 0 });
    expect((await runReminderSweep(NOW)).period).toBe(0);
    expect(notifyOrThrow).not.toHaveBeenCalled();
  });

  it("nudges daily logging only after the chosen hour and only if nothing was logged today", async () => {
    const pref = (id: string, hour: number) => ({
      id,
      userId: id,
      reminderHour: hour,
      timezone: "Africa/Kigali",
      emailEnabled: false,
      user: { ...user, patientProfile: { id: `pp-${id}` } },
    });
    prefsQuery({ daily: [pref("early", 18), pref("late", 21), pref("logged", 18)] });
    mock.habitLog.count.mockImplementation(async ({ where }: { where: { patientProfileId: string } }) =>
      where.patientProfileId === "pp-logged" ? 1 : 0,
    );
    mock.cycleDayLog.count.mockResolvedValue(0);
    const r = await runReminderSweep(NOW);
    expect(r.daily).toBe(1);
    expect(notifyOrThrow).toHaveBeenCalledWith(expect.objectContaining({ recipientId: "early" }));
  });

  it("sends the Monday check-in with a short summary", async () => {
    prefsQuery({
      weekly: [
        {
          id: "w1",
          userId: "w1",
          reminderHour: 9,
          timezone: "Africa/Kigali",
          emailEnabled: false,
          user: { ...user, patientProfile: { id: "pp-w1", menstrualCycle: "28" } },
        },
      ],
    });
    mock.cycleDayLog.count.mockResolvedValue(4);
    mock.cycleLog.findMany.mockResolvedValue([{ startDate: parseDateKey("2026-10-25"), endDate: null }]);
    const r = await runReminderSweep(NOW);
    expect(r.weekly).toBe(1);
    expect(notifyOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Your weekly health check-in",
        body: "You logged 4 of the last 7 days. Your next period is predicted in about 6 days.",
      }),
    );
  });

  it("reminds both sides of an appointment and flags it only when both were delivered", async () => {
    mock.appointment.findMany.mockResolvedValue([
      {
        id: "a1",
        startTime: new Date("2026-11-17T08:00:00Z"),
        patient: { user: { id: "p1", ...user, deletedAt: null, reminderPreference: null } },
        practitioner: { user: { id: "doc1", name: "Dr. Eric" } },
      },
    ]);
    const r = await runReminderSweep(NOW);
    expect(r.appointments).toBe(1);
    expect(notifyOrThrow).toHaveBeenCalledWith(expect.objectContaining({ recipientId: "doc1" }));
    expect(notifyOrThrow).toHaveBeenCalledWith(expect.objectContaining({ recipientId: "p1" }));
    expect(mock.appointment.updateMany).toHaveBeenCalledWith({
      where: { id: "a1", reminderSentAt: null },
      data: { reminderSentAt: expect.any(Date) },
    });
  });

  it("leaves the appointment unflagged and counts a failure when the patient email fails", async () => {
    mock.appointment.findMany.mockResolvedValue([
      {
        id: "a2",
        startTime: new Date("2026-11-17T08:00:00Z"),
        patient: { user: { id: "p1", ...user, deletedAt: null, reminderPreference: null } },
        practitioner: { user: { id: "doc1", name: "Dr. Eric" } },
      },
    ]);
    sendReminderEmail.mockRejectedValue(new Error("Resend down"));
    const r = await runReminderSweep(NOW);
    expect(r.failed).toBe(1);
    expect(mock.appointment.updateMany).not.toHaveBeenCalled();
  });
});
