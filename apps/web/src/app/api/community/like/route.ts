import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { requirePremiumApi } from "@/lib/entitlements";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    if (session.user.role === "PATIENT") {
      const gate = await requirePremiumApi(session.user.id);
      if (!gate.ok) return gate.response;
    }

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
