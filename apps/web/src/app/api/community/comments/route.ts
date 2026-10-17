import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { parseMentionsAndNotify } from "@/lib/mentions";
import { z } from "zod";
import { parseJson } from "@/lib/api";
import { sanitizePlainText } from "@/lib/sanitize";
import { idSchema } from "@/lib/validation/common";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

const CommentInput = z.object({
  postId: idSchema,
  content: z.string().trim().min(1, "Comment cannot be empty").max(2000, "Comments must be under 2000 characters."),
});

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

    const limit = rateLimit(`community-comment:${session.user.id}`, 30, 10 * 60_000);
    if (!limit.allowed) return rateLimitResponse(limit);

    const parsed = await parseJson(req, CommentInput);
    if (!parsed.ok) return parsed.response;
    const { postId } = parsed.data;
    const content = sanitizePlainText(parsed.data.content);
    if (!content) return new NextResponse("Comment cannot be empty", { status: 400 });

    const post = await prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) return new NextResponse("Post not found", { status: 404 });

    const comment = await prisma.communityComment.create({
      data: {
        postId,
        content,
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
