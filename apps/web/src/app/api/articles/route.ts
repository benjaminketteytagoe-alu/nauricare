import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const tag = new URL(req.url).searchParams.get("tag");

    const articles = await prisma.article.findMany({
      where: {
        isPublished: true,
        ...(tag ? { tags: { has: tag } } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, content: true, tags: true, createdAt: true },
    });

    return NextResponse.json(articles);
  } catch (error) {
    console.error("[ARTICLES_GET_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
