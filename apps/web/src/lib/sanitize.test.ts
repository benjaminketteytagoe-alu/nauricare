import { describe, expect, it } from "vitest";
import { sanitizePlainText } from "./sanitize";

describe("sanitizePlainText", () => {
  it("keeps ordinary text, including characters React escapes itself", () => {
    expect(sanitizePlainText("  Cramps & bloating < 3 days  ")).toBe("Cramps & bloating < 3 days");
    expect(sanitizePlainText(`She said "it's fine"`)).toBe(`She said "it's fine"`);
  });

  it("strips tags and their script content", () => {
    expect(sanitizePlainText("Hello <b>there</b><script>alert(1)</script>")).toBe("Hello there");
    expect(sanitizePlainText('<img src=x onerror="alert(1)">pic')).toBe("pic");
  });

  it("does not let entity-encoded markup survive", () => {
    expect(sanitizePlainText("&lt;script&gt;alert(1)&lt;/script&gt;ok")).not.toMatch(/<script/i);
    expect(sanitizePlainText("&amp;lt;img src=x onerror=1&amp;gt;")).not.toMatch(/<img/i);
  });
});
