import { z } from "zod";
import { apiError, apiSuccess, handle, notFound, parseJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth-guards";
import { parseMentionsAndNotify } from "@/lib/mentions";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";
import { sanitizePlainText } from "@/lib/sanitize";
import { idSchema } from "@/lib/validation/common";
import { requireCommunityAvatar, scrubAuthor } from "@/server/community/avatars";
import { notify } from "@/server/notifications/notify";

const CommentInput = z.object({
  postId: idSchema,
  content: z.string().trim().min(1, "Comment cannot be empty").max(2000, "Comments must be under 2000 characters."),
});

export async function GET(req: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  return handle(async () => {
    const url = new URL(req.url);
    const postId = url.searchParams.get("postId");
    if (!postId) return apiError("postId required.", 400);

    const comments = await prisma.communityComment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: { id: true, name: true, role: true, avatarUrl: true, handle: true } },
      },
    });

    return apiSuccess(comments.map(scrubAuthor));
  });
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  return handle(async () => {
    const limited = enforceRateLimit(`community-comment:${auth.user.id}`, 30, 10 * 60_000);
    if (limited) return limited;

    const noAvatar = await requireCommunityAvatar(auth.user.id);
    if (noAvatar) return noAvatar;

    const parsed = await parseJson(req, CommentInput);
    if (!parsed.ok) return parsed.response;
    const { postId } = parsed.data;
    const content = sanitizePlainText(parsed.data.content);
    if (!content) return apiError("Comment cannot be empty.", 400);

    const post = await prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) return notFound("Post not found.");

    const comment = await prisma.communityComment.create({
      data: {
        postId,
        content,
        authorId: auth.user.id,
      },
      include: {
        author: { select: { id: true, name: true, role: true, avatarUrl: true, handle: true } },
      },
    });

    await notify({
      recipientId: post.authorId,
      actorId: auth.user.id,
      type: "COMMUNITY_COMMENT",
      title: `${auth.user.name ?? "Someone"} commented on your post`,
      body: content.slice(0, 140),
      link: "/dashboard/community",
      postId,
      commentId: comment.id,
    });

    // Fire-and-forget: parse @mentions in comment content and notify matched users.
    void parseMentionsAndNotify(comment.content, auth.user.id, "MENTION_COMMENT", postId, comment.id);

    return apiSuccess(scrubAuthor(comment), 201);
  });
}
