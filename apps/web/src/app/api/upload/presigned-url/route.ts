import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { apiError, apiSuccess, handle, validateBody, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rateLimit";
import { s3, AWS_REGION, AWS_S3_BUCKET, s3IsConfigured } from "@/lib/s3";

const UploadInput = z.object({
  filename: z.string().min(1).max(255),
  fileType: z.string().min(1).max(100),
  fileSize: z.number().int(),
  context: z.enum(["avatar", "community"]).optional(),
});

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

// Strip path components and anything outside a conservative safe charset —
// the raw filename is attacker-controlled input, never trusted as-is in a key.
function sanitizeFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? "upload";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

export async function POST(req: Request) {
  // ── Guard: S3 not configured ──────────────────────────────────────────────
  if (!s3IsConfigured()) {
    logger.error({ event: "uploads.s3_not_configured" }, "Upload requested but AWS_S3_BUCKET_NAME is not set");
    return apiError("File uploads are not available right now. Please contact support.", 503);
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;

  const limited = enforceRateLimit(`upload-presign:${userId}`, 20, 10 * 60_000);
  if (limited) return limited;
  const parsed = validateBody(await readJson(req), UploadInput, "filename, fileType, and fileSize are required");
  if (!parsed.ok) return parsed.response;
  const { filename, fileType, fileSize, context } = parsed.data;

  return handle(async () => {
    const folder = context === "avatar" ? "avatars" : "community";

    const isImage = ALLOWED_IMAGE_TYPES.has(fileType);
    const isVideo = ALLOWED_VIDEO_TYPES.has(fileType);

    if (!isImage && !isVideo) {
      return apiError("Unsupported file type. Allowed: JPEG, PNG, WEBP, GIF, MP4, WEBM, MOV.", 400);
    }

    if (folder === "avatars" && isVideo) {
      return apiError("Profile pictures must be an image.", 400);
    }

    const cap = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (fileSize <= 0 || fileSize > cap) {
      return apiError(`File exceeds the ${cap / (1024 * 1024)}MB limit for ${isImage ? "images" : "videos"}.`, 400);
    }

    const mediaType = isImage ? "IMAGE" : "VIDEO";
    const key = `${folder}/${userId}/${randomUUID()}-${sanitizeFilename(filename)}`;

    // ── Presigned URL generation ───────────────────────────────────────────
    let uploadUrl: string;
    try {
      const command = new PutObjectCommand({
        Bucket: AWS_S3_BUCKET,
        Key: key,
        ContentType: fileType,
        // ContentLength is signed into the URL — S3 rejects any PUT whose
        // actual byte count doesn't match, preventing size-limit bypass.
        ContentLength: fileSize,
      });

      uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });
    } catch (s3Error) {
      logger.error({ event: "uploads.presign_failed", err: s3Error }, "Generating the upload URL failed");
      return apiError("Could not generate upload URL. Please try again.", 500);
    }

    // Construct the public URL from the same constants used above so it is
    // never built from a raw process.env value that could be undefined.
    const publicUrl = `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;

    return apiSuccess({ uploadUrl, publicUrl, mediaType });
  });
}
