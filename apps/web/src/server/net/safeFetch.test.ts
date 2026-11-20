import { describe, expect, it } from "vitest";
import { isPublicAddress, safeGet } from "./safeFetch";

describe("isPublicAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254", // cloud metadata
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "::",
    "fd00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "::ffff:169.254.169.254",
    "2001:db8::1",
    "not-an-ip",
  ])("blocks %s", (ip) => expect(isPublicAddress(ip)).toBe(false));

  it.each(["8.8.8.8", "1.1.1.1", "172.32.0.1", "41.186.1.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"])(
    "allows %s",
    (ip) => expect(isPublicAddress(ip)).toBe(true),
  );
});

describe("safeGet", () => {
  it("refuses non-http schemes, embedded credentials and literal private IPs before connecting", async () => {
    await expect(safeGet("file:///etc/passwd")).rejects.toThrow(/http/);
    await expect(safeGet("ftp://example.com/")).rejects.toThrow(/http/);
    await expect(safeGet("https://user:pass@example.com/")).rejects.toThrow(/Credentials/);
    await expect(safeGet("http://169.254.169.254/latest/meta-data")).rejects.toThrow(/non-public/);
    await expect(safeGet("http://[::1]:3000/")).rejects.toThrow(/non-public/);
  });
});
