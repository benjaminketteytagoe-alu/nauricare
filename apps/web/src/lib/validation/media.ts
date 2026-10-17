import { z } from "zod";
import { AWS_REGION, AWS_S3_BUCKET } from "@/lib/s3";

// User media must come from NauriCare's own upload hosts. Anything else (a
// tracking pixel, a third-party video, a javascript: URL) is rejected, so a
// post can never make other viewers' browsers fetch an attacker's URL.

function allowedHosts(): string[] {
  const hosts = ["res.cloudinary.com"];
  if (AWS_S3_BUCKET) hosts.push(`${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com`);
  return hosts;
}

export function isAllowedMediaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && allowedHosts().includes(url.hostname);
  } catch {
    return false;
  }
}

export const mediaUrlSchema = z
  .string()
  .max(2048)
  .refine(isAllowedMediaUrl, { message: "Media must be uploaded through NauriCare." });
