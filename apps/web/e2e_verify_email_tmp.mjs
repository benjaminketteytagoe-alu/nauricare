import { PrismaClient } from "@prisma/client";
import { randomBytes, createHash } from "crypto";

const prisma = new PrismaClient();
const stamp = Date.now();

async function makeUser(emailSuffix) {
  const user = await prisma.user.create({
    data: {
      email: `qa-verify-${emailSuffix}-${stamp}@test.local`,
      name: "QA Verify User",
      passwordHash: "x",
      role: "PATIENT",
      isEmailVerified: false,
    },
  });
  return user;
}

// 1. Happy path user + valid token (mirrors register route's exact logic)
const happyUser = await makeUser("happy");
const happyRaw = randomBytes(32).toString("hex");
const happyHash = createHash("sha256").update(happyRaw).digest("hex");
await prisma.emailVerificationToken.create({
  data: { tokenHash: happyHash, userId: happyUser.id, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
});

// 2. Expired token user
const expiredUser = await makeUser("expired");
const expiredRaw = randomBytes(32).toString("hex");
const expiredHash = createHash("sha256").update(expiredRaw).digest("hex");
await prisma.emailVerificationToken.create({
  data: { tokenHash: expiredHash, userId: expiredUser.id, expiresAt: new Date(Date.now() - 1000) },
});

console.log(JSON.stringify({
  happyUserId: happyUser.id, happyRaw,
  expiredUserId: expiredUser.id, expiredRaw,
}));
await prisma.$disconnect();
