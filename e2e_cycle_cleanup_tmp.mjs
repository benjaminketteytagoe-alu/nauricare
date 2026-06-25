import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
await prisma.user.delete({ where: { id: "cmqtj7u1p0000ltvcks2ouhln" } });
console.log("cleaned up");
await prisma.$disconnect();
