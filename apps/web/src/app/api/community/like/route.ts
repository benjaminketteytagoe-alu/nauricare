import { z } from "zod";
import { apiSuccess, handle, notFound, parseJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";
import { idSchema } from "@/lib/validation/common";
import { notify } from "@/server/notifications/notify";

const LikeInput = z.object({ postId: idSchema });

// Toggles the caller's like on a post.
export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { id: userId, name } = auth.user;
  const limited = enforceRateLimit(`community-like:${userId}`, 120, 60_000);
  if (limited) return limited;
  const body = await parseJson(req, LikeInput);
  if (!body.ok) return body.response;
  const { postId } = body.data;

  return handle(async () => {
    const post = await prisma.communityPost.findUnique({ where: { id: postId }, select: { id: true, authorId: true } });
    if (!post) return notFound("Post not found.");

    const existing = await prisma.communityLike.findUnique({ where: { postId_userId: { postId, userId } } });
    if (existing) {
      await prisma.communityLike.delete({ where: { id: existing.id } });
      return apiSuccess({ liked: false });
    }

    await prisma.communityLike.create({ data: { postId, userId } });
    await notify({
      recipientId: post.authorId,
      actorId: userId,
      type: "COMMUNITY_LIKE",
      title: `${name ?? "Someone"} liked your post`,
      link: "/dashboard/community",
      postId,
    });
    return apiSuccess({ liked: true });
  });
}
