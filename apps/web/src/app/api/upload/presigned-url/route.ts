import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Strip path components and anything outside a conservative safe charset —
// the raw filename is attacker-controlled input, never trusted as-is in a key.
function sanitizeFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? "upload";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filename, fileType, fileSize, context } = await req.json();

    if (!filename || !fileType || typeof fileSize !== "number") {
      return NextResponse.json({ error: "filename, fileType, and fileSize are required" }, { status: 400 });
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

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
      ContentLength: fileSize, // signed into the request — S3 rejects a PUT whose actual byte size doesn't match
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });
    const publicUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return NextResponse.json({ uploadUrl, publicUrl, mediaType });
  } catch (error) {
    console.error("[PRESIGNED_URL_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
