import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaMock } from "../../test/prismaMock";

const { notify } = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock("@/lib/prisma", async () => ({ prisma: (await import("../../test/prismaMock")).createPrismaMock() }));
vi.mock("@/server/notifications/notify", () => ({ notify }));
const mock = (await import("@/lib/prisma")).prisma as unknown as PrismaMock;
const { parseMentionsAndNotify } = await import("./mentions");

describe("parseMentionsAndNotify", () => {
  afterEach(() => vi.resetAllMocks());

  it("looks up each handle once, case-insensitively, excluding the author", async () => {
    mock.user.findMany.mockResolvedValue([{ id: "u2" }]);
    await parseMentionsAndNotify("Hi @Aline and @aline, also @eric!", "u1", "MENTION_COMMENT", "p1", "c1");
    expect(mock.user.findMany).toHaveBeenCalledWith({
      where: { handle: { in: ["aline", "eric"] }, id: { not: "u1" } },
      select: { id: true },
    });
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: "u2", title: "You were mentioned in a comment", commentId: "c1" }),
    );
  });

  it("caps mentions per text and does nothing without any", async () => {
    await parseMentionsAndNotify("no mentions here", "u1", "MENTION_POST");
    expect(mock.user.findMany).not.toHaveBeenCalled();

    mock.user.findMany.mockResolvedValue([]);
    await parseMentionsAndNotify(Array.from({ length: 50 }, (_, i) => `@user${i}`).join(" "), "u1", "MENTION_POST");
    expect(mock.user.findMany.mock.calls[0][0].where.handle.in).toHaveLength(10);
  });

  it("never throws", async () => {
    mock.user.findMany.mockRejectedValue(new Error("db down"));
    await expect(parseMentionsAndNotify("@aline", "u1", "MENTION_POST")).resolves.toBeUndefined();
  });
});
