import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
await prisma.cycleLog.deleteMany({ where: { patientProfileId: "cmqtj7ug00002ltvcfmt08wer" } });
console.log("reset done");
await prisma.$disconnect();
