import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
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
            patientProfile: { select: { country: true } },
            practitionerProfile: { select: { specialty: true } },
          },
        },
        _count: { select: { likes: true, comments: true, reposts: true } },
        // Nested repost: show condensed version of the original post
        repostOf: {
          include: {
            author: {
              select: { id: true, name: true, role: true },
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

    const enriched = posts.map(({ likes, _count, ...post }) => ({
      ...post,
      likeCount: _count.likes,
      commentCount: _count.comments,
      repostCount: _count.reposts,
      isLikedByMe: likes.length > 0,
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

    const { content, imageUrl, repostOfId } = await req.json();

    if (!content?.trim() && !imageUrl) {
      return new NextResponse("Post must have content or an image", { status: 400 });
    }

    const post = await prisma.communityPost.create({
      data: {
        content: content?.trim() ?? "",
        imageUrl: imageUrl || null,
        authorId: session.user.id,
        repostOfId: repostOfId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
            patientProfile: { select: { country: true } },
            practitionerProfile: { select: { specialty: true } },
          },
        },
        repostOf: {
          include: { author: { select: { id: true, name: true, role: true } } },
        },
      },
    });

    return NextResponse.json(
      { ...post, likeCount: 0, commentCount: 0, repostCount: 0, isLikedByMe: false },
      { status: 201 }
    );
  } catch (error) {
    console.error("[COMMUNITY_FEED_POST_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
