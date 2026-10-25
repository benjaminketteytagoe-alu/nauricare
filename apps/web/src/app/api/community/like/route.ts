import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { notify } from "@/server/notifications/notify";
import { z } from "zod";
import { parseJson } from "@/lib/api";
import { idSchema } from "@/lib/validation/common";

const LikeInput = z.object({ postId: idSchema });

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const parsed = await parseJson(req, LikeInput);
    if (!parsed.ok) return parsed.response;
    const { postId } = parsed.data;

    const post = await prisma.communityPost.findUnique({ where: { id: postId }, select: { id: true, authorId: true } });
    if (!post) return new NextResponse("Post not found", { status: 404 });

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
    await notify({
      recipientId: post.authorId,
      actorId: session.user.id,
      type: "COMMUNITY_LIKE",
      title: `${session.user.name ?? "Someone"} liked your post`,
      link: "/dashboard/community",
      postId,
    });

    return NextResponse.json({ liked: true });
  } catch (error) {
    console.error("[COMMUNITY_LIKE_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
