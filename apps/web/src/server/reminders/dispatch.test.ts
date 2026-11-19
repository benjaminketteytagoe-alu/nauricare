import { Prisma } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaMock } from "../../../test/prismaMock";

vi.mock("@/lib/prisma", async () => ({ prisma: (await import("../../../test/prismaMock")).createPrismaMock() }));
const mock = (await import("@/lib/prisma")).prisma as unknown as PrismaMock;
const { claim, deliver } = await import("./dispatch");

const duplicate = () =>
  new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "test" });
const fresh = { id: "d1", dedupeKey: "period:u1:2026-11-20", notifiedAt: null, emailedAt: null };

describe("reminder ledger", () => {
  afterEach(() => vi.resetAllMocks());

  describe("claim", () => {
    it("claims a new key", async () => {
      mock.reminderDispatch.create.mockResolvedValue(fresh);
      expect(await claim(fresh.dedupeKey, "period", "u1")).toEqual(fresh);
    });

    it("re-claims a FAILED or abandoned key, but not a SENT or busy one", async () => {
      mock.reminderDispatch.create.mockRejectedValue(duplicate());
      mock.reminderDispatch.updateMany.mockResolvedValue({ count: 1 });
      mock.reminderDispatch.findUnique.mockResolvedValue(fresh);
      expect(await claim(fresh.dedupeKey, "period", "u1")).toEqual(fresh);
      const where = mock.reminderDispatch.updateMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([{ status: "FAILED" }, { status: "CLAIMED", claimedAt: { lt: expect.any(Date) } }]);

      mock.reminderDispatch.updateMany.mockResolvedValue({ count: 0 });
      expect(await claim(fresh.dedupeKey, "period", "u1")).toBeNull();
    });

    it("rethrows unexpected database errors", async () => {
      mock.reminderDispatch.create.mockRejectedValue(new Error("connection lost"));
      await expect(claim("k", "period", "u1")).rejects.toThrow("connection lost");
    });
  });

  describe("deliver", () => {
    it("runs each step once, passes an idempotency key and marks the row SENT", async () => {
      const notify = vi.fn();
      const email = vi.fn();
      expect(await deliver(fresh, { notify, email })).toBe(true);
      expect(email).toHaveBeenCalledWith(`reminder/${fresh.dedupeKey}`);
      expect(mock.reminderDispatch.update.mock.calls.at(-1)![0].data).toMatchObject({ status: "SENT" });
    });

    it("skips steps already done on a previous attempt", async () => {
      const notify = vi.fn();
      const email = vi.fn();
      await deliver({ ...fresh, notifiedAt: new Date() }, { notify, email });
      expect(notify).not.toHaveBeenCalled();
      expect(email).toHaveBeenCalled();
    });

    it("marks the row FAILED and returns false when a step throws", async () => {
      mock.reminderDispatch.update.mockResolvedValue({});
      const ok = await deliver(fresh, {
        notify: vi.fn(),
        email: vi.fn().mockRejectedValue(new Error("Resend 429")),
      });
      expect(ok).toBe(false);
      expect(mock.reminderDispatch.update.mock.calls.at(-1)![0].data).toEqual({
        status: "FAILED",
        lastError: "Resend 429",
      });
    });
  });
});
