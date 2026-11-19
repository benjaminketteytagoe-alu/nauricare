import { apiSuccess, handle } from "@/lib/api";
import { requireApiUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const tag = new URL(req.url).searchParams.get("tag");
  return handle(async () =>
    apiSuccess(
      await prisma.article.findMany({
        where: { isPublished: true, ...(tag ? { tags: { has: tag } } : {}) },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, content: true, tags: true, createdAt: true },
      }),
    ),
  );
}
