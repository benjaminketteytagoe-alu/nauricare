import { PrismaClient } from "@prisma/client";
import { randomBytes, createHash } from "crypto";
import { sendMagicLinkEmail } from "./src/lib/email.ts";

const prisma = new PrismaClient();
const email = process.argv[2];

const rawToken = randomBytes(32).toString("hex");
const tokenHash = createHash("sha256").update(`${rawToken}${process.env.NEXTAUTH_SECRET}`).digest("hex");
const expires = new Date(Date.now() + 10 * 60 * 1000);

await prisma.verificationToken.create({ data: { identifier: email, token: tokenHash, expires } });

const callbackUrl = `${process.env.NEXTAUTH_URL}/dashboard`;
const magicUrl = `${process.env.NEXTAUTH_URL}/api/auth/callback/email?${new URLSearchParams({ callbackUrl, token: rawToken, email })}`;

console.log("MAGIC_URL:", magicUrl);

if (process.argv[3] === "--send-email") {
  await sendMagicLinkEmail({ to: email, url: magicUrl });
  console.log("Email sent via Resend.");
}

await prisma.$disconnect();
