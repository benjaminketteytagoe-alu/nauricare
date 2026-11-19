import { describe, expect, it } from "vitest";
import { maxSeverity, screenRedFlags } from "./redFlags";

describe("screenRedFlags", () => {
  it("stays LOW for routine symptoms", () => {
    expect(screenRedFlags(["bloating", "mild cramps"], "a bit tired")).toEqual({ floor: "LOW", flags: [] });
  });

  it("escalates heavy bleeding with fainting to URGENT", () => {
    const r = screenRedFlags(["heavy bleeding"], "I felt dizzy and nearly passed out");
    expect(r.floor).toBe("URGENT");
    expect(r.flags.length).toBeGreaterThan(0);
  });

  it("escalates bleeding in a possible pregnancy to URGENT", () => {
    expect(screenRedFlags([], "Missed period and now some spotting").floor).toBe("URGENT");
  });

  it("escalates chest pain to URGENT regardless of case", () => {
    expect(screenRedFlags([], "CHEST PAIN since this morning").floor).toBe("URGENT");
  });

  it("raises severe pain to at least MODERATE", () => {
    expect(screenRedFlags(["severe cramps"], "").floor).not.toBe("LOW");
  });
});

describe("maxSeverity", () => {
  it("never lowers severity", () => {
    expect(maxSeverity("URGENT", "LOW")).toBe("URGENT");
    expect(maxSeverity("LOW", "MODERATE")).toBe("MODERATE");
    expect(maxSeverity("MODERATE", "MODERATE")).toBe("MODERATE");
  });
});
