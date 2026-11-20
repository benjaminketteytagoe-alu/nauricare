import { describe, expect, it } from "vitest";
import { insuranceLabel, insurerKey, matchListedInsurer } from "./constants";

describe("insurance helpers", () => {
  it("labels listed insurers and the patient's own name for OTHER_PRIVATE", () => {
    expect(insuranceLabel("RSSB_RAMA")).toBe("RSSB (RAMA)");
    expect(insuranceLabel("OTHER_PRIVATE", "  Prime Life ")).toBe("Prime Life");
    expect(insuranceLabel("OTHER_PRIVATE", " ")).toBe("Other private insurer");
    expect(insuranceLabel(null)).toBe("Not provided");
  });

  it("matches typed names to listed insurers regardless of case and punctuation", () => {
    expect(insurerKey("UAP / Old-Mutual")).toBe("uapoldmutual");
    expect(matchListedInsurer("britam")).toBe("BRITAM");
    expect(matchListedInsurer("UAP Old-Mutual")).toBe("UAP_OLD_MUTUAL");
    expect(matchListedInsurer("Other private insurer")).toBeNull();
    expect(matchListedInsurer("Prime Life")).toBeNull();
    expect(matchListedInsurer("!!!")).toBeNull();
  });
});
