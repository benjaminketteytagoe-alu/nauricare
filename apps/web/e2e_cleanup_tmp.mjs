import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const ids = ["cmqqp2gb20000lt6w3lf4gmpi", "cmqqp2gn80001lt6wjdm62idw", "cmqqp2hs70003lt6w94thxps9"];
const result = await prisma.user.deleteMany({ where: { id: { in: ids } } });
console.log("deleted users:", result.count);
await prisma.$disconnect();
