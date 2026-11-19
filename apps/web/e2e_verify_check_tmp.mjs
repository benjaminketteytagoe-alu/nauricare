import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const happy = await prisma.user.findUnique({ where: { id: "cmqsascy60000ltvqu7lqqmlh" } });
const expired = await prisma.user.findUnique({ where: { id: "cmqsase5k0003ltvqj83s8au6" } });
const remainingTokens = await prisma.emailVerificationToken.count({
  where: { userId: { in: [happy.id, expired.id] } },
});

console.log("happy.isEmailVerified:", happy.isEmailVerified, "(expect true)");
console.log("expired.isEmailVerified:", expired.isEmailVerified, "(expect false)");
console.log("remaining tokens for both test users:", remainingTokens, "(expect 0 — both consumed/deleted)");
await prisma.$disconnect();
