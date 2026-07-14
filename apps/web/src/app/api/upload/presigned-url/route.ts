import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { s3, AWS_REGION, AWS_S3_BUCKET, s3IsConfigured } from "@/lib/s3";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;  // 5MB
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
    console.error(
      "PRODUCTION S3 UPLOAD FAILURE STACK: S3 environment variables are not configured. " +
        "Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET_NAME.",
    );
    return NextResponse.json(
      { error: "File uploads are not available right now. Please contact support." },
      { status: 503 },
    );
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { filename, fileType, fileSize, context } = await req.json();

    if (!filename || !fileType || typeof fileSize !== "number") {
      return NextResponse.json(
        { error: "filename, fileType, and fileSize are required" },
        { status: 400 },
      );
    }

    const folder = context === "avatar" ? "avatars" : "community";

    const isImage = ALLOWED_IMAGE_TYPES.has(fileType);
    const isVideo = ALLOWED_VIDEO_TYPES.has(fileType);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Unsupported file type. Allowed: JPEG, PNG, WEBP, GIF, MP4, WEBM, MOV." },
        { status: 400 },
      );
    }

    if (folder === "avatars" && isVideo) {
      return NextResponse.json({ error: "Profile pictures must be an image." }, { status: 400 });
    }

    const cap = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (fileSize <= 0 || fileSize > cap) {
      return NextResponse.json(
        { error: `File exceeds the ${cap / (1024 * 1024)}MB limit for ${isImage ? "images" : "videos"}.` },
        { status: 400 },
      );
    }

    const mediaType = isImage ? "IMAGE" : "VIDEO";
    const key = `${folder}/${session.user.id}/${randomUUID()}-${sanitizeFilename(filename)}`;

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
      console.error("PRODUCTION S3 UPLOAD FAILURE STACK:", s3Error);
      return NextResponse.json(
        { error: "Could not generate upload URL. Please try again." },
        { status: 500 },
      );
    }

    // Construct the public URL from the same constants used above so it is
    // never built from a raw process.env value that could be undefined.
    const publicUrl = `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;

    return NextResponse.json({ uploadUrl, publicUrl, mediaType });
  } catch (error) {
    console.error("PRODUCTION S3 UPLOAD FAILURE STACK:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
