import { apiSuccess, handle, notFound } from "@/lib/api";
import { requireApiUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  return handle(async () => {
    const article = await prisma.article.findFirst({ where: { id, isPublished: true } });
    return article ? apiSuccess(article) : notFound();
  });
}
