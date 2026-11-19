import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstileToken } from "./turnstile";

describe("verifyTurnstileToken", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchMock.mockReset();
  });

  it("fails closed without a secret or a token", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(await verifyTurnstileToken("tok")).toBe(false);
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    expect(await verifyTurnstileToken("")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the secret, token and IP to siteverify and trusts only success: true", async () => {
    fetchMock.mockResolvedValue(Response.json({ success: true }));
    expect(await verifyTurnstileToken("tok", "41.1.1.1")).toBe(true);
    const body = fetchMock.mock.calls[0][1]!.body as URLSearchParams;
    expect(Object.fromEntries(body)).toEqual({ secret: "secret", response: "tok", remoteip: "41.1.1.1" });

    fetchMock.mockResolvedValue(Response.json({ success: false, "error-codes": ["invalid-input-response"] }));
    expect(await verifyTurnstileToken("tok")).toBe(false);
    fetchMock.mockResolvedValue(Response.json({ success: "true" }));
    expect(await verifyTurnstileToken("tok")).toBe(false);
  });

  it("fails closed when Cloudflare is unreachable", async () => {
    fetchMock.mockRejectedValue(new Error("ENOTFOUND"));
    expect(await verifyTurnstileToken("tok")).toBe(false);
  });
});
