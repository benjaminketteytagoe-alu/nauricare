import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { parseMentionsAndNotify } from "@/lib/mentions";
import { z } from "zod";
import { parseJson } from "@/lib/api";
import { sanitizePlainText } from "@/lib/sanitize";
import { idSchema } from "@/lib/validation/common";
import { mediaUrlSchema } from "@/lib/validation/media";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { requireCommunityAvatar, scrubAuthor } from "@/server/community/avatars";

const PostInput = z
  .object({
    content: z.string().max(5000, "Posts must be under 5000 characters.").default(""),
    mediaUrl: mediaUrlSchema.optional().or(z.literal("")).or(z.null()),
    mediaType: z.enum(["IMAGE", "VIDEO"]).optional().or(z.null()),
    repostOfId: idSchema.optional().or(z.literal("")).or(z.null()),
  })
  .refine((v) => v.content.trim().length > 0 || !!v.mediaUrl || !!v.repostOfId, { message: "Post must have content or media" });

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
    const take = 10;
    const skip = (page - 1) * take;

    const posts = await prisma.communityPost.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
            avatarUrl: true,
            handle: true,
            patientProfile: { select: { country: true } },
            practitionerProfile: { select: { specialty: true } },
          },
        },
        _count: { select: { likes: true, comments: true, reposts: true } },
        repostOf: {
          include: {
            author: {
              select: { id: true, name: true, role: true, avatarUrl: true, handle: true },
            },
          },
        },
        likes: {
          where: { userId: session.user.id },
          select: { id: true },
        },
      },
    });

    const authorIds = [...new Set(posts.map((p) => p.authorId).filter((id) => id !== session.user.id))];
    const myFollows = authorIds.length
      ? await prisma.follow.findMany({
          where: { followerId: session.user.id, followingId: { in: authorIds } },
          select: { followingId: true },
        })
      : [];
    const followedSet = new Set(myFollows.map((f) => f.followingId));

    const enriched = posts.map(({ likes, _count, ...post }) => ({
      ...scrubAuthor(post),
      repostOf: post.repostOf ? scrubAuthor(post.repostOf) : null,
      likeCount: _count.likes,
      commentCount: _count.comments,
      repostCount: _count.reposts,
      isLikedByMe: likes.length > 0,
      isFollowedByMe: followedSet.has(post.authorId),
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("[COMMUNITY_FEED_GET_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const limit = rateLimit(`community-post:${session.user.id}`, 10, 10 * 60_000);
    if (!limit.allowed) return rateLimitResponse(limit);

    const noAvatar = await requireCommunityAvatar(session.user.id);
    if (noAvatar) return noAvatar;

    const parsed = await parseJson(req, PostInput);
    if (!parsed.ok) return parsed.response;
    const { mediaUrl, mediaType, repostOfId } = parsed.data;
    const content = sanitizePlainText(parsed.data.content);

    if (repostOfId) {
      const original = await prisma.communityPost.findUnique({ where: { id: repostOfId }, select: { id: true } });
      if (!original) return new NextResponse("Original post not found", { status: 404 });
    }

    const post = await prisma.communityPost.create({
      data: {
        content,
        mediaUrl: mediaUrl || null,
        mediaType: mediaUrl ? (mediaType ?? "IMAGE") : null,
        authorId: session.user.id,
        repostOfId: repostOfId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
            avatarUrl: true,
            handle: true,
            patientProfile: { select: { country: true } },
            practitionerProfile: { select: { specialty: true } },
          },
        },
        repostOf: {
          include: {
            author: { select: { id: true, name: true, role: true, avatarUrl: true, handle: true } },
          },
        },
      },
    });

    // Fire-and-forget: parse @mentions in post content and notify matched users.
    if (post.content) {
      void parseMentionsAndNotify(post.content, session.user.id, "MENTION_POST", post.id);
    }

    return NextResponse.json(
      { ...scrubAuthor(post), repostOf: post.repostOf ? scrubAuthor(post.repostOf) : null, likeCount: 0, commentCount: 0, repostCount: 0, isLikedByMe: false, isFollowedByMe: false },
      { status: 201 },
    );
  } catch (error) {
    console.error("[COMMUNITY_FEED_POST_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
