import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/s3", () => ({ AWS_REGION: "us-east-1", AWS_S3_BUCKET: "nauricare-uploads" }));
const { isAllowedMediaUrl, mediaUrlSchema } = await import("./media");

describe("media URL allow-list", () => {
  it("accepts NauriCare's own upload hosts over https", () => {
    expect(isAllowedMediaUrl("https://nauricare-uploads.s3.us-east-1.amazonaws.com/community/u/1.png")).toBe(true);
    expect(isAllowedMediaUrl("https://res.cloudinary.com/x/image.png")).toBe(true);
  });

  it.each([
    "http://nauricare-uploads.s3.us-east-1.amazonaws.com/a.png",
    "https://evil.example/pixel.gif",
    "https://nauricare-uploads.s3.us-east-1.amazonaws.com.evil.example/a.png",
    "javascript:alert(1)",
    "not a url",
  ])("rejects %s", (url) => {
    expect(isAllowedMediaUrl(url)).toBe(false);
    expect(mediaUrlSchema.safeParse(url).success).toBe(false);
  });
});
