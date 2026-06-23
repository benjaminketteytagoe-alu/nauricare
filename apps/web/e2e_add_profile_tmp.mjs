import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const profile = await prisma.patientProfile.create({
  data: { userId: "cmqqp2hs70003lt6w94thxps9", country: "Rwanda" },
});
console.log(JSON.stringify(profile));
await prisma.$disconnect();
