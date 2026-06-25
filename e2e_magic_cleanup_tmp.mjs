import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const result = await prisma.user.deleteMany({
  where: { id: { in: ["cmqtlj02d0000lt5n1cgriivu", "cmqtlj0ds0001lt5n454lf1oc", "cmqtlj0jf0002lt5nbv08ozno"] } },
});
console.log("deleted users:", result.count);
await prisma.$disconnect();
