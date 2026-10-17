import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseJson } from "@/lib/api";
import { sanitizePlainText } from "@/lib/sanitize";
import { mediaUrlSchema } from "@/lib/validation/media";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

const StoryInput = z
  .object({
    content: z.string().max(500, "Stories must be under 500 characters.").optional().or(z.null()),
    imageUrl: mediaUrlSchema.optional().or(z.literal("")).or(z.null()),
  })
  .refine((v) => !!v.content?.trim() || !!v.imageUrl, { message: "Story must have content or an image" });

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const stories = await prisma.communityStory.findMany({
      where: { expiresAt: { gt: new Date() } },
      include: {
        author: { select: { id: true, name: true, role: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by authorId so the UI can render one ring per author.
    // Stories within each group are already sorted newest-first.
    const groupMap = new Map<
      string,
      {
        author: { id: string; name: string; role: string; avatarUrl: string | null };
        storyCount: number;
        stories: Array<{
          id: string;
          content: string | null;
          imageUrl: string | null;
          createdAt: Date;
          expiresAt: Date;
        }>;
      }
    >();

    for (const s of stories) {
      const existing = groupMap.get(s.authorId);
      const storyData = {
        id: s.id,
        content: s.content,
        imageUrl: s.imageUrl,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      };
      if (existing) {
        existing.stories.push(storyData);
        existing.storyCount++;
      } else {
        groupMap.set(s.authorId, {
          author: s.author,
          storyCount: 1,
          stories: [storyData],
        });
      }
    }

    return NextResponse.json(Array.from(groupMap.values()));
  } catch (error) {
    console.error("[COMMUNITY_STORIES_GET_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const limit = rateLimit(`community-story:${session.user.id}`, 10, 60 * 60_000);
    if (!limit.allowed) return rateLimitResponse(limit);

    const parsed = await parseJson(req, StoryInput);
    if (!parsed.ok) return parsed.response;
    const { imageUrl } = parsed.data;
    const content = parsed.data.content ? sanitizePlainText(parsed.data.content) : "";

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1_000);

    const story = await prisma.communityStory.create({
      data: {
        content: content || null,
        imageUrl: imageUrl || null,
        authorId: session.user.id,
        expiresAt,
      },
      include: { author: { select: { id: true, name: true, role: true, avatarUrl: true } } },
    });

    return NextResponse.json(story, { status: 201 });
  } catch (error) {
    console.error("[COMMUNITY_STORIES_POST_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
