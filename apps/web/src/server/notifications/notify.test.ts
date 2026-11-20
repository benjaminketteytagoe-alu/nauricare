import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaMock } from "../../../test/prismaMock";

vi.mock("@/lib/prisma", async () => ({ prisma: (await import("../../../test/prismaMock")).createPrismaMock() }));
const mock = (await import("@/lib/prisma")).prisma as unknown as PrismaMock;
const { notify, notifyOrThrow } = await import("./notify");
const { subscribe } = await import("@/server/realtime/bus");

describe("notifications", () => {
  afterEach(() => vi.resetAllMocks());

  it("stores, truncates and pushes the notification live", async () => {
    mock.userNotification.create.mockResolvedValue({ id: "n1" });
    const events: unknown[] = [];
    const off = subscribe("u1", (e) => events.push(e));
    await notifyOrThrow({ recipientId: "u1", type: "SYSTEM", title: "t".repeat(200), link: "/dashboard" });
    off();
    const { data } = mock.userNotification.create.mock.calls[0][0];
    expect(data.title).toHaveLength(140);
    expect(data.link).toBe("/dashboard");
    expect(events).toEqual([{ type: "notification", id: "n1" }]);
  });

  it("drops off-site links and never notifies you about your own action", async () => {
    mock.userNotification.create.mockResolvedValue({ id: "n2" });
    await notifyOrThrow({ recipientId: "u1", type: "SYSTEM", link: "https://evil.example" });
    expect(mock.userNotification.create.mock.calls[0][0].data.link).toBeNull();
    await notifyOrThrow({ recipientId: "u1", actorId: "u1", type: "COMMUNITY_LIKE" });
    expect(mock.userNotification.create).toHaveBeenCalledTimes(1);
  });

  it("notify swallows failures; notifyOrThrow does not", async () => {
    mock.userNotification.create.mockRejectedValue(new Error("db down"));
    await expect(notify({ recipientId: "u1", type: "SYSTEM" })).resolves.toBeUndefined();
    await expect(notifyOrThrow({ recipientId: "u1", type: "SYSTEM" })).rejects.toThrow("db down");
  });
});
