import { S3Client } from "@aws-sdk/client-s3";

// ── Startup env-var audit ──────────────────────────────────────────────────────
// Run once when the module is first imported (server startup / first warm lambda).
// Logs a sanitised warning — never prints the secret values themselves.

const REQUIRED_VARS = [
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_REGION",
  "AWS_S3_BUCKET_NAME",
] as const;

type RequiredVar = (typeof REQUIRED_VARS)[number];

const MISSING_VARS: RequiredVar[] = (REQUIRED_VARS as readonly RequiredVar[]).filter(
  (v) => !process.env[v],
);

if (MISSING_VARS.length > 0) {
  // Use warn (not error) — the server is still bootable; only uploads will fail.
  console.warn(
    `[S3 CONFIG] Missing required env vars: ${MISSING_VARS.join(", ")}. ` +
      "Profile picture and media uploads will return 503 until these are set.",
  );
}

// ── Exported constants ─────────────────────────────────────────────────────────
// Fall back to empty strings so the S3Client constructor never receives
// `undefined` — the SDK accepts empty strings and defers the error to the
// actual network call, where our catch block can surface it cleanly.

export const AWS_REGION    = process.env.AWS_REGION         ?? "us-east-1";
export const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET_NAME ?? "";

export const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID     ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

/** Returns true only when all four required env vars are present. */
export function s3IsConfigured(): boolean {
  return MISSING_VARS.length === 0;
}
