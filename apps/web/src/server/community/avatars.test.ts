import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaMock } from "../../../test/prismaMock";

vi.mock("@/lib/prisma", async () => ({ prisma: (await import("../../../test/prismaMock")).createPrismaMock() }));
const mock = (await import("@/lib/prisma")).prisma as unknown as PrismaMock;
const { requireCommunityAvatar, scrubAuthor } = await import("./avatars");

describe("community avatar policy", () => {
  afterEach(() => vi.resetAllMocks());

  it("scrubs a patient's photo but keeps a provider's", () => {
    const photo = "https://lh3.googleusercontent.com/a/x";
    expect(scrubAuthor({ id: 1, author: { role: "PATIENT", avatarUrl: photo } }).author.avatarUrl).toBeNull();
    expect(scrubAuthor({ author: { role: "PROVIDER", avatarUrl: photo } }).author.avatarUrl).toBe(photo);
  });

  it("asks patients without a preset to choose one before posting", async () => {
    mock.user.findUnique.mockResolvedValue({ role: "PATIENT", avatarUrl: null });
    const res = await requireCommunityAvatar("u1");
    expect(res?.status).toBe(409);
    expect(await res?.json()).toMatchObject({ code: "AVATAR_REQUIRED" });

    mock.user.findUnique.mockResolvedValue({ role: "PATIENT", avatarUrl: "/avatars/afro.svg" });
    expect(await requireCommunityAvatar("u1")).toBeNull();
    mock.user.findUnique.mockResolvedValue({ role: "PROVIDER", avatarUrl: null });
    expect(await requireCommunityAvatar("u1")).toBeNull();
  });
});
