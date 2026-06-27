import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

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
        // Fetch enriched author: role badge + profile data for display
        author: {
          select: {
            id: true,
            name: true,
            role: true,
            avatarUrl: true,
            patientProfile: { select: { country: true } },
            practitionerProfile: { select: { specialty: true } },
          },
        },
        _count: { select: { likes: true, comments: true, reposts: true } },
        // Nested repost: show condensed version of the original post
        repostOf: {
          include: {
            author: {
              select: { id: true, name: true, role: true, avatarUrl: true },
            },
          },
        },
        // Narrow to the current user's like only — avoids leaking all likes
        likes: {
          where: { userId: session.user.id },
          select: { id: true },
        },
      },
    });

    // Resolve follow state for every distinct author in this page (excluding
    // myself — the UI never shows a follow button on my own posts anyway).
    const authorIds = [...new Set(posts.map((p) => p.authorId).filter((id) => id !== session.user.id))];
    const myFollows = authorIds.length
      ? await prisma.follow.findMany({
          where: { followerId: session.user.id, followingId: { in: authorIds } },
          select: { followingId: true },
        })
      : [];
    const followedSet = new Set(myFollows.map((f) => f.followingId));

    const enriched = posts.map(({ likes, _count, ...post }) => ({
      ...post,
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

    const { content, mediaUrl, mediaType, repostOfId } = await req.json();

    if (!content?.trim() && !mediaUrl) {
      return new NextResponse("Post must have content or media", { status: 400 });
    }

    if (mediaType && mediaType !== "IMAGE" && mediaType !== "VIDEO") {
      return new NextResponse("Invalid mediaType", { status: 400 });
    }

    const post = await prisma.communityPost.create({
      data: {
        content: content?.trim() ?? "",
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
            patientProfile: { select: { country: true } },
            practitionerProfile: { select: { specialty: true } },
          },
        },
        repostOf: {
          include: { author: { select: { id: true, name: true, role: true, avatarUrl: true } } },
        },
      },
    });

    return NextResponse.json(
      { ...post, likeCount: 0, commentCount: 0, repostCount: 0, isLikedByMe: false, isFollowedByMe: false },
      { status: 201 }
    );
  } catch (error) {
    console.error("[COMMUNITY_FEED_POST_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
