import { describe, expect, it } from "vitest";
import { distanceKm, formatDistance, KIGALI } from "./distance";

describe("distance", () => {
  it("is zero for the same point and symmetric", () => {
    const huye = { lat: -2.5967, lng: 29.7394 };
    expect(distanceKm(KIGALI, KIGALI)).toBe(0);
    expect(distanceKm(KIGALI, huye)).toBeCloseTo(distanceKm(huye, KIGALI), 9);
    expect(distanceKm(KIGALI, huye)).toBeGreaterThan(70);
    expect(distanceKm(KIGALI, huye)).toBeLessThan(85);
  });

  it("formats metres, one decimal under 10 km, whole km above", () => {
    expect(formatDistance(0.42)).toBe("420 m away");
    expect(formatDistance(3.26)).toBe("3.3 km away");
    expect(formatDistance(42.6)).toBe("43 km away");
  });
});
