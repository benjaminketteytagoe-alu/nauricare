// Geometry for the Sparkline component (components/ui/data.tsx), kept pure so
// it can be unit-tested. Values map into a w×h box with `pad` px inset.

export interface SparkGeometry {
  line: string;
  area: string;
  points: { x: number; y: number }[];
  /** Reference band (e.g. a lab's normal range) as a y-range, when given. */
  band?: { y: number; height: number };
}

export function sparkGeometry(
  values: readonly number[],
  { width, height, pad = 2, band }: { width: number; height: number; pad?: number; band?: [number, number] },
): SparkGeometry {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return { line: "", area: "", points: [] };

  const domain = band ? [...finite, band[0], band[1]] : finite;
  let min = Math.min(...domain);
  let max = Math.max(...domain);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const y = (v: number) => pad + innerH - ((v - min) / (max - min)) * innerH;
  const step = finite.length > 1 ? innerW / (finite.length - 1) : 0;
  const round = (n: number) => Math.round(n * 100) / 100;

  const points = finite.map((v, i) => ({ x: round(finite.length > 1 ? pad + i * step : width / 2), y: round(y(v)) }));
  const line = points.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  const area = first && last ? `${line} L${last.x} ${height - pad} L${first.x} ${height - pad} Z` : "";

  const geometry: SparkGeometry = { line, area, points };
  if (band) {
    const top = round(y(Math.max(band[0], band[1])));
    const bottom = round(y(Math.min(band[0], band[1])));
    geometry.band = { y: top, height: round(bottom - top) };
  }
  return geometry;
}

/** Screen-reader summary, e.g. "5 readings from 42 to 55, latest 55". */
export function sparkSummary(values: readonly number[], unit = ""): string {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return "No readings yet";
  const u = unit ? ` ${unit}` : "";
  const latest = finite[finite.length - 1];
  if (finite.length === 1) return `1 reading: ${latest}${u}`;
  return `${finite.length} readings from ${Math.min(...finite)} to ${Math.max(...finite)}${u}, latest ${latest}${u}`;
}
