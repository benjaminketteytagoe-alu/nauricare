import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const stamp = Date.now();
const user = await prisma.user.create({
  data: { email: `qa-cycle-${stamp}@test.local`, name: "QA Cycle Patient", passwordHash: "x", role: "PATIENT", isEmailVerified: true },
});
const profile = await prisma.patientProfile.create({
  data: { userId: user.id, country: "Rwanda", menstrualCycle: "30" },
});
console.log(JSON.stringify({ userId: user.id, profileId: profile.id, email: user.email }));
await prisma.$disconnect();
