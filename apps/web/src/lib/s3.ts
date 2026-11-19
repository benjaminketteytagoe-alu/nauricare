import { S3Client } from "@aws-sdk/client-s3";

// ── Credentials ────────────────────────────────────────────────────────────────
// On ECS the task role supplies short-lived credentials through the SDK's
// default provider chain, so no AWS keys need to exist at runtime (see
// infra/terraform/modules/ecs-service). Static keys are still honoured when
// both are set, for local development against a real bucket.

const STATIC_KEYS = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

export const AWS_REGION = process.env.AWS_REGION ?? "us-east-1";
export const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET_NAME ?? "";

if (!AWS_S3_BUCKET) {
  // Use warn (not error): the server still boots; only uploads return 503.
  console.warn("[S3 CONFIG] AWS_S3_BUCKET_NAME is not set. Profile picture and media uploads will return 503.");
}

export const s3 = new S3Client({
  region: AWS_REGION,
  ...(STATIC_KEYS && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }),
});

/** True when a bucket is configured. Credentials come from the task role or static keys. */
export function s3IsConfigured(): boolean {
  return AWS_S3_BUCKET !== "";
}
