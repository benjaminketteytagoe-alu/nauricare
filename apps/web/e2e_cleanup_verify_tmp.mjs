import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const result = await prisma.user.deleteMany({
  where: { id: { in: ["cmqsascy60000ltvqu7lqqmlh", "cmqsase5k0003ltvqj83s8au6"] } },
});
console.log("deleted users:", result.count);
await prisma.$disconnect();
