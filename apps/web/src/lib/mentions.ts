import { prisma } from "@/lib/prisma";
import { UserNotificationType } from "@prisma/client";

// \w = [a-zA-Z0-9_] — no catastrophic backtracking risk.
// The {1,30} quantifier caps each handle length and bounds the match.
const MENTION_RE = /\@(\w{1,30})/g;

// Hard cap: ignore excess mentions beyond this to prevent notification flooding
// from adversarial inputs like "@a @b @c … × 1000".
const MAX_MENTIONS_PER_TEXT = 10;

/**
 * Parses @handles from `text`, looks them up in the DB, and creates
 * UserNotification rows for every matched user (excluding the actor).
 *
 * Fire-and-forget safe: errors are caught and logged so they never
 * bubble up and abort the parent post/comment write.
 */
export async function parseMentionsAndNotify(
  text: string,
  actorId: string,
  type: UserNotificationType,
  postId?: string,
  commentId?: string,
): Promise<void> {
  try {
    const handles = new Set<string>();

    for (const match of text.matchAll(MENTION_RE)) {
      handles.add(match[1].toLowerCase());
      if (handles.size >= MAX_MENTIONS_PER_TEXT) break;
    }

    if (handles.size === 0) return;

    const users = await prisma.user.findMany({
      where: {
        handle: { in: [...handles] },
        id: { not: actorId }, // never notify yourself
      },
      select: { id: true },
    });

    if (users.length === 0) return;

    await prisma.userNotification.createMany({
      data: users.map((u) => ({
        recipientId: u.id,
        actorId,
        type,
        postId: postId ?? null,
        commentId: commentId ?? null,
      })),
      skipDuplicates: true,
    });
  } catch (err) {
    // Logging only — notification failures must never abort the parent write.
    console.error("[MENTION_NOTIFY_ERROR]", err);
  }
}
