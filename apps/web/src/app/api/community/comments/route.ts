import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { parseMentionsAndNotify } from "@/lib/mentions";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const url = new URL(req.url);
    const postId = url.searchParams.get("postId");
    if (!postId) return new NextResponse("postId required", { status: 400 });

    const comments = await prisma.communityComment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: { id: true, name: true, role: true, avatarUrl: true, handle: true } },
      },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("[COMMUNITY_COMMENTS_GET_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const { postId, content } = await req.json();
    if (!postId || !content?.trim()) {
      return new NextResponse("postId and content are required", { status: 400 });
    }

    const post = await prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) return new NextResponse("Post not found", { status: 404 });

    const comment = await prisma.communityComment.create({
      data: {
        postId,
        content: content.trim(),
        authorId: session.user.id,
      },
      include: {
        author: { select: { id: true, name: true, role: true, avatarUrl: true, handle: true } },
      },
    });

    // Fire-and-forget: parse @mentions in comment content and notify matched users.
    void parseMentionsAndNotify(comment.content, session.user.id, "MENTION_COMMENT", postId, comment.id);

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("[COMMUNITY_COMMENTS_POST_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
