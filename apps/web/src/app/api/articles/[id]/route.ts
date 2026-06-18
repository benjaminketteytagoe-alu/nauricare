import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;

    const article = await prisma.article.findFirst({
      where: { id, isPublished: true },
    });

    if (!article) return new NextResponse("Not found", { status: 404 });

    return NextResponse.json(article);
  } catch (error) {
    console.error("[ARTICLE_DETAIL_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
