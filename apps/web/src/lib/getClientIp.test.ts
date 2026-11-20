import { describe, expect, it } from "vitest";
import { getClientIp } from "./getClientIp";

describe("getClientIp", () => {
  it("prefers Cloudflare's header, then the first forwarded hop, then x-real-ip", () => {
    expect(getClientIp(new Headers({ "cf-connecting-ip": " 41.1.1.1 ", "x-forwarded-for": "9.9.9.9" }))).toBe(
      "41.1.1.1",
    );
    expect(getClientIp(new Headers({ "x-forwarded-for": "41.2.2.2, 10.0.0.1" }))).toBe("41.2.2.2");
    expect(getClientIp(new Headers({ "x-real-ip": "41.3.3.3" }))).toBe("41.3.3.3");
    expect(getClientIp(new Headers())).toBe("unknown");
  });
});
