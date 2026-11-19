import { describe, expect, it } from "vitest";
import { sparkGeometry, sparkSummary } from "./sparkline";

describe("sparkGeometry", () => {
  it("returns empty paths with no finite values", () => {
    expect(sparkGeometry([NaN], { width: 100, height: 20 })).toEqual({ line: "", area: "", points: [] });
  });

  it("maps min to the bottom and max to the top inside the padding", () => {
    const g = sparkGeometry([0, 10], { width: 100, height: 20, pad: 2 });
    expect(g.points).toEqual([
      { x: 2, y: 18 },
      { x: 98, y: 2 },
    ]);
    expect(g.line).toBe("M2 18 L98 2");
    expect(g.area).toBe("M2 18 L98 2 L98 18 L2 18 Z");
  });

  it("centres a single point and handles a flat series", () => {
    const g = sparkGeometry([5], { width: 100, height: 20, pad: 0 });
    expect(g.points).toEqual([{ x: 50, y: 10 }]);
    expect(sparkGeometry([3, 3, 3], { width: 10, height: 10, pad: 0 }).points.map((p) => p.y)).toEqual([5, 5, 5]);
  });

  it("includes the reference band in the scale", () => {
    const g = sparkGeometry([5, 6], { width: 100, height: 100, pad: 0, band: [0, 10] });
    expect(g.band).toEqual({ y: 0, height: 100 });
    expect(g.points[0]?.y).toBe(50);
  });
});

describe("sparkSummary", () => {
  it("describes the series for screen readers", () => {
    expect(sparkSummary([])).toBe("No readings yet");
    expect(sparkSummary([42], "ng/dL")).toBe("1 reading: 42 ng/dL");
    expect(sparkSummary([42, 55, 48], "ng/dL")).toBe("3 readings from 42 to 55 ng/dL, latest 48 ng/dL");
  });
});
