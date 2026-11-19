import { apiSuccess, handle } from "@/lib/api";
import { requireApiUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

// Partner pharmacies for the routing dropdown. Any signed-in role may call this.
export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  return handle(async () =>
    apiSuccess(
      await prisma.pharmacy.findMany({
        select: { id: true, name: true, address: true, contactEmail: true, tags: true },
        orderBy: { name: "asc" },
      }),
    ),
  );
}
