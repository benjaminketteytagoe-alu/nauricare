import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const u = await prisma.user.findUnique({
  where: { id: "cmqqp2gn80001lt6wjdm62idw" },
  include: { practitionerProfile: true },
});
console.log(JSON.stringify(u, null, 2));
await prisma.$disconnect();
