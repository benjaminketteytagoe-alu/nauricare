import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const user = await prisma.user.findUnique({ where: { id: "cmqtlj0ds0001lt5n454lf1oc" } });
const remainingTokens = await prisma.verificationToken.count({ where: { identifier: "qa-magic-unverified-1782397626494@test.local" } });
console.log("isEmailVerified:", user.isEmailVerified, "(expect true)");
console.log("emailVerified (adapter field):", user.emailVerified, "(expect a Date)");
console.log("remaining VerificationToken rows:", remainingTokens, "(expect 0 - single use)");
await prisma.$disconnect();
