import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaMock } from "../../../test/prismaMock";

const { safeGet } = vi.hoisted(() => ({ safeGet: vi.fn() }));
vi.mock("@/server/net/safeFetch", () => ({ safeGet }));
vi.mock("@/lib/prisma", async () => ({ prisma: (await import("../../../test/prismaMock")).createPrismaMock() }));
const mock = (await import("@/lib/prisma")).prisma as unknown as PrismaMock;
const { backfillCoordinates, geocode, geocodePractice } = await import("./geocode");

const hits = (...results: ({ lat: string; lon: string } | null)[]) => {
  for (const r of results)
    safeGet.mockResolvedValueOnce({ status: 200, body: Buffer.from(JSON.stringify(r ? [r] : [])) });
};
/** Runs fn while flushing the 1.1 s Nominatim throttle instantly. */
async function flush<T>(fn: () => Promise<T>): Promise<T> {
  const p = fn();
  await vi.runAllTimersAsync();
  return p;
}

describe("geocoding", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("queries Nominatim within Rwanda and caches results", async () => {
    hits({ lat: "-1.95", lon: "30.06" });
    expect(await flush(() => geocode("KN 4 Ave,   Kigali"))).toEqual({ lat: -1.95, lng: 30.06 });
    expect(await flush(() => geocode("kn 4 ave, kigali"))).toEqual({ lat: -1.95, lng: 30.06 });
    expect(safeGet).toHaveBeenCalledTimes(1);
    expect(String(safeGet.mock.calls[0][0])).toContain("countrycodes=rw");
  });

  it("returns null for short queries, misses and failures", async () => {
    expect(await geocode("ab")).toBeNull();
    safeGet.mockResolvedValueOnce({ status: 503, body: Buffer.from("") });
    expect(await flush(() => geocode("Unknown place one"))).toBeNull();
    safeGet.mockRejectedValueOnce(new Error("timeout"));
    expect(await flush(() => geocode("Unknown place two"))).toBeNull();
  });

  it("tries clinic+location, then location, then clinic", async () => {
    hits(null, { lat: "-1.9", lon: "30.1" });
    expect(await flush(() => geocodePractice("Remera", "Nauri Clinic A"))).toEqual({ lat: -1.9, lng: 30.1 });
    expect(String(safeGet.mock.calls[0][0])).toContain(encodeURIComponent("Nauri Clinic A, Remera, Rwanda"));
    expect(await geocodePractice(null, null)).toBeNull();
  });

  it("backfills providers and hospitals that have no coordinates", async () => {
    mock.practitionerProfile.findMany.mockResolvedValue([{ id: "p1", location: "Kacyiru Town", clinicName: null }]);
    mock.hospital.findMany.mockResolvedValue([{ id: "h1", name: "Nowhere Hospital X", address: null }]);
    hits({ lat: "-1.94", lon: "30.08" }, null);
    expect(await flush(() => backfillCoordinates())).toEqual({ providers: 1, hospitals: 0, notFound: 1 });
    expect(mock.practitionerProfile.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { latitude: -1.94, longitude: 30.08 },
    });
  });
});
