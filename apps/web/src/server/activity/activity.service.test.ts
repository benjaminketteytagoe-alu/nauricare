import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaMock } from "../../../test/prismaMock";

vi.mock("@/lib/prisma", async () => ({ prisma: (await import("../../../test/prismaMock")).createPrismaMock() }));
const mock = (await import("@/lib/prisma")).prisma as unknown as PrismaMock;
const { recordActivity, recordPatientActivity } = await import("./activity.service");

describe("patient activity", () => {
  afterEach(() => vi.resetAllMocks());

  it("records a truncated title, JSON-safe details and the reference", async () => {
    await recordActivity({
      userId: "u1",
      type: "PROFILE_UPDATED",
      title: "x".repeat(300),
      details: { at: new Date("2026-11-19T00:00:00Z"), skip: undefined },
      ref: { type: "Referral", id: "r1" },
    });
    const { data } = mock.patientActivity.create.mock.calls[0][0];
    expect(data.title).toHaveLength(200);
    expect(data.details).toEqual({ at: "2026-11-19T00:00:00.000Z" });
    expect([data.refType, data.refId]).toEqual(["Referral", "r1"]);
  });

  it("never throws, and ignores non-patients", async () => {
    mock.patientActivity.create.mockRejectedValue(new Error("db down"));
    await expect(recordActivity({ userId: "u1", type: "PROFILE_UPDATED", title: "t" })).resolves.toBeUndefined();
    await recordPatientActivity("PROVIDER", { userId: "u1", type: "PROFILE_UPDATED", title: "t" });
    expect(mock.patientActivity.create).toHaveBeenCalledTimes(1);
  });
});
