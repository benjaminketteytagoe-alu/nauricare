import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const stamp = Date.now();

const verifiedUser = await prisma.user.create({
  data: { email: `qa-magic-verified-${stamp}@test.local`, name: "QA Verified", passwordHash: "x", role: "PATIENT", isEmailVerified: true },
});
const unverifiedUser = await prisma.user.create({
  data: { email: `qa-magic-unverified-${stamp}@test.local`, name: "QA Unverified", passwordHash: "x", role: "PATIENT", isEmailVerified: false },
});
// Simulates a pre-adapter Google user: has a User row, but no Account row at all.
const preAdapterGoogleUser = await prisma.user.create({
  data: { email: `qa-google-preadapter-${stamp}@test.local`, name: "QA PreAdapter Google", passwordHash: "", role: "PATIENT", isEmailVerified: true },
});

console.log(JSON.stringify({ verifiedUser, unverifiedUser, preAdapterGoogleUser }));
await prisma.$disconnect();
