import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const logs = await prisma.cycleLog.findMany({ where: { patientProfileId: "cmqtj7ug00002ltvcfmt08wer" } });
console.log(JSON.stringify(logs, null, 2));
await prisma.$disconnect();
