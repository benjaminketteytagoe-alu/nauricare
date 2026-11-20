import { z } from "zod";
import { apiSuccess, handle, parseJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";
import { sanitizePlainText } from "@/lib/sanitize";
import { mediaUrlSchema } from "@/lib/validation/media";
import { requireCommunityAvatar, scrubAuthor } from "@/server/community/avatars";

const StoryInput = z
  .object({
    content: z.string().max(500, "Stories must be under 500 characters.").optional().or(z.null()),
    imageUrl: mediaUrlSchema.optional().or(z.literal("")).or(z.null()),
  })
  .refine((v) => !!v.content?.trim() || !!v.imageUrl, { message: "Story must have content or an image" });

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  return handle(async () => {
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
          author: scrubAuthor(s).author,
          storyCount: 1,
          stories: [storyData],
        });
      }
    }

    return apiSuccess(Array.from(groupMap.values()));
  });
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  return handle(async () => {
    const limited = enforceRateLimit(`community-story:${auth.user.id}`, 10, 60 * 60_000);
    if (limited) return limited;

    const noAvatar = await requireCommunityAvatar(auth.user.id);
    if (noAvatar) return noAvatar;

    const parsed = await parseJson(req, StoryInput);
    if (!parsed.ok) return parsed.response;
    const { imageUrl } = parsed.data;
    const content = parsed.data.content ? sanitizePlainText(parsed.data.content) : "";

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1_000);

    const story = await prisma.communityStory.create({
      data: {
        content: content || null,
        imageUrl: imageUrl || null,
        authorId: auth.user.id,
        expiresAt,
      },
      include: { author: { select: { id: true, name: true, role: true, avatarUrl: true } } },
    });

    return apiSuccess(scrubAuthor(story), 201);
  });
}
