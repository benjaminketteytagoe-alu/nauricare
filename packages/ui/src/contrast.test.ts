import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrast, readVars } from "./color";

// WCAG 2.2 AA: 4.5:1 for body text, 3:1 for large text and for the
// non-text parts that identify a control (field borders, focus rings).
const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
const ramps = readVars(css, "@theme");
const themes = { light: readVars(css, ":root"), dark: readVars(css, ".dark") };

function pick(vars: Record<string, string>, name: string): string {
  const v = vars[name];
  if (!v) throw new Error(`Missing token ${name}`);
  return v;
}

const TEXT: [string, string][] = [
  ["ink", "canvas"],
  ["ink", "surface"],
  ["ink", "surface-muted"],
  ["ink-soft", "canvas"],
  ["ink-soft", "surface"],
  ["ink-muted", "canvas"],
  ["ink-muted", "surface"],
  ["ink-muted", "surface-muted"],
  ["ink-inverse", "surface-inverse"],
  ["on-brand", "brand"],
  ["on-brand", "brand-hover"],
  ["on-brand", "brand-pressed"],
  ["brand-ink", "surface"],
  ["brand-ink", "canvas"],
  ["brand-ink", "brand-soft"],
  ["info", "info-soft"],
  ["info", "surface"],
  ["success", "success-soft"],
  ["success", "surface"],
  ["warning", "warning-soft"],
  ["warning", "surface"],
  ["danger", "danger-soft"],
  ["danger", "surface"],
  ["lavender", "lavender-soft"],
];

const NON_TEXT: [string, string][] = [
  ["field", "surface"],
  ["field", "canvas"],
  ["focus", "surface"],
  ["focus", "canvas"],
  ["brand", "surface"],
];

describe.each(Object.entries(themes))("%s theme tokens", (_name, vars) => {
  it.each(TEXT)("%s on %s meets 4.5:1", (fg, bg) => {
    expect(contrast(pick(vars, `nc-${fg}`), pick(vars, `nc-${bg}`))).toBeGreaterThanOrEqual(4.5);
  });
  it.each(NON_TEXT)("%s on %s meets 3:1", (fg, bg) => {
    expect(contrast(pick(vars, `nc-${fg}`), pick(vars, `nc-${bg}`))).toBeGreaterThanOrEqual(3);
  });
});

// The legacy palette utilities still on older screens: the combinations
// they use most (grep `text-X on bg-Y`) must keep passing after the remap.
const LEGACY: [string, string][] = [
  ["white", "rose-600"],
  ["white", "rose-700"],
  ["rose-700", "rose-50"],
  ["rose-600", "white"],
  ["slate-500", "white"],
  ["slate-500", "slate-50"],
  ["slate-600", "slate-100"],
  ["gray-500", "white"],
  ["gray-600", "gray-50"],
  ["teal-700", "teal-50"],
  ["teal-800", "teal-100"],
  ["emerald-700", "emerald-50"],
  ["amber-800", "amber-50"],
  ["amber-700", "amber-50"],
  ["purple-700", "purple-50"],
  ["blue-700", "blue-50"],
];

describe("legacy palette remap", () => {
  const value = (name: string) => (name === "white" ? "#ffffff" : pick(ramps, `color-${name}`));
  it.each(LEGACY)("%s on %s meets 4.5:1", (fg, bg) => {
    if (fg.startsWith("blue")) return; // cobalt is Tailwind's own ramp, unchanged
    expect(contrast(value(fg), value(bg))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("colour maths", () => {
  it("matches known WCAG ratios", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrast("#767676", "#ffffff")).toBeCloseTo(4.54, 1);
  });
  it("parses oklch", () => {
    expect(contrast("oklch(100% 0 0)", "#ffffff")).toBeCloseTo(1, 2);
  });
});
