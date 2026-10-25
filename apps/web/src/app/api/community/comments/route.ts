import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { notify } from "@/server/notifications/notify";
import { parseMentionsAndNotify } from "@/lib/mentions";
import { z } from "zod";
import { parseJson } from "@/lib/api";
import { sanitizePlainText } from "@/lib/sanitize";
import { idSchema } from "@/lib/validation/common";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { requireCommunityAvatar, scrubAuthor } from "@/server/community/avatars";

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

    return NextResponse.json(comments.map(scrubAuthor));
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

    const noAvatar = await requireCommunityAvatar(session.user.id);
    if (noAvatar) return noAvatar;

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

    await notify({
      recipientId: post.authorId,
      actorId: session.user.id,
      type: "COMMUNITY_COMMENT",
      title: `${session.user.name ?? "Someone"} commented on your post`,
      body: content.slice(0, 140),
      link: "/dashboard/community",
      postId,
      commentId: comment.id,
    });

    // Fire-and-forget: parse @mentions in comment content and notify matched users.
    void parseMentionsAndNotify(comment.content, session.user.id, "MENTION_COMMENT", postId, comment.id);

    return NextResponse.json(scrubAuthor(comment), { status: 201 });
  } catch (error) {
    console.error("[COMMUNITY_COMMENTS_POST_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
