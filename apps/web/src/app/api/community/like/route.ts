import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const { postId } = await req.json();
    if (!postId) return new NextResponse("postId required", { status: 400 });

    const existing = await prisma.communityLike.findUnique({
      where: { postId_userId: { postId, userId: session.user.id } },
    });

    if (existing) {
      await prisma.communityLike.delete({ where: { id: existing.id } });
      return NextResponse.json({ liked: false });
    }

    await prisma.communityLike.create({
      data: { postId, userId: session.user.id },
    });

    return NextResponse.json({ liked: true });
  } catch (error) {
    console.error("[COMMUNITY_LIKE_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
