import { afterEach, describe, expect, it, vi } from "vitest";

const { safeGet, send, s3IsConfigured } = vi.hoisted(() => ({
  safeGet: vi.fn(),
  send: vi.fn(),
  s3IsConfigured: vi.fn(() => true),
}));
vi.mock("@/server/net/safeFetch", () => ({ safeGet }));
vi.mock("@/lib/s3", () => ({ s3: { send }, s3IsConfigured, AWS_REGION: "us-east-1", AWS_S3_BUCKET: "bucket" }));
const { fetchRemoteImage, rehostImage } = await import("./images");

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(1)]);
const reply = (body: Buffer, status = 200) => safeGet.mockResolvedValue({ status, body, contentType: "image/png" });

describe("remote images", () => {
  afterEach(() => {
    vi.resetAllMocks();
    s3IsConfigured.mockReturnValue(true);
  });

  it("identifies images by their bytes, not the Content-Type header", async () => {
    reply(JPEG);
    expect((await fetchRemoteImage("https://x/a"))?.contentType).toBe("image/jpeg");
    reply(PNG);
    expect((await fetchRemoteImage("https://x/a"))?.ext).toBe("png");
    reply(WEBP);
    expect((await fetchRemoteImage("https://x/a"))?.ext).toBe("webp");
    reply(Buffer.from("<svg onload=alert(1)>"));
    expect(await fetchRemoteImage("https://x/a")).toBeNull();
  });

  it("returns null on HTTP errors and blocked fetches", async () => {
    reply(JPEG, 404);
    expect(await fetchRemoteImage("https://x/a")).toBeNull();
    safeGet.mockRejectedValue(new Error("Blocked non-public address"));
    expect(await fetchRemoteImage("http://169.254.169.254/")).toBeNull();
  });

  it("re-hosts into S3 with an immutable cache header", async () => {
    reply(PNG);
    const url = await rehostImage("https://clinic.rw/dr.png", "providers");
    expect(url).toMatch(/^https:\/\/bucket\.s3\.us-east-1\.amazonaws\.com\/providers\/[0-9a-f-]+\.png$/);
    expect(send.mock.calls[0][0].input).toMatchObject({ Bucket: "bucket", ContentType: "image/png" });

    s3IsConfigured.mockReturnValue(false);
    expect(await rehostImage("https://clinic.rw/dr.png", "providers")).toBeNull();
  });
});
