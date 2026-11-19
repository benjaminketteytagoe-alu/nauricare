import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { AWS_REGION, AWS_S3_BUCKET, s3, s3IsConfigured } from "@/lib/s3";
import { safeGet } from "@/server/net/safeFetch";

// Fetches a remote image safely (SSRF-guarded, size-capped, type-checked by
// magic bytes, not just the Content-Type header) and optionally re-hosts it
// in our S3 bucket, so pages never hot-link third-party sites (which the CSP
// would block anyway).

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface FetchedImage {
  body: Buffer;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  ext: "jpg" | "png" | "webp";
}

function sniff(buf: Buffer): FetchedImage["contentType"] | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

export async function fetchRemoteImage(url: string): Promise<FetchedImage | null> {
  try {
    const res = await safeGet(url, { maxBytes: MAX_IMAGE_BYTES, accept: "image/jpeg,image/png,image/webp", timeoutMs: 15_000 });
    if (res.status !== 200) return null;
    const contentType = sniff(res.body);
    if (!contentType) return null;
    return { body: res.body, contentType, ext: contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg" };
  } catch {
    return null;
  }
}

/** Copies a remote image into S3 under `folder/`; null if S3 isn't configured or the image is unusable. */
export async function rehostImage(url: string, folder: string): Promise<string | null> {
  if (!s3IsConfigured()) return null;
  const image = await fetchRemoteImage(url);
  if (!image) return null;
  const key = `${folder}/${randomUUID()}.${image.ext}`;
  await s3.send(new PutObjectCommand({ Bucket: AWS_S3_BUCKET, Key: key, Body: image.body, ContentType: image.contentType, CacheControl: "public, max-age=31536000, immutable" }));
  return `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
}
