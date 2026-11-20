"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { notify } from "@/server/notifications/notify";

export async function followUser(followingId: string) {
  try {
    const caller = await getSessionUser();
    if (!caller?.id) return { success: false, error: "Unauthorized" };
    if (caller.id === followingId) {
      return { success: false, error: "You can't follow yourself." };
    }

    // Check existence before upsert so we only notify on a genuinely new follow.
    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: caller.id, followingId } },
      select: { id: true },
    });

    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: caller.id, followingId } },
      update: {},
      create: { followerId: caller.id, followingId },
    });

    if (!existing) {
      void notify({
        recipientId: followingId,
        actorId: caller.id,
        type: "FOLLOW",
        title: `${caller.name ?? "Someone"} started following you`,
        link: "/dashboard/community",
      }).catch((err: unknown) =>
        logger.error({ event: "community.follow_notify_failed", err }, "Follow notification failed"),
      );
    }

    revalidatePath("/dashboard/community");
    return { success: true };
  } catch (error) {
    logger.error({ event: "community.follow_failed", err: error }, "Follow failed");
    return { success: false, error: "Failed to follow user." };
  }
}

export async function unfollowUser(followingId: string) {
  try {
    const caller = await getSessionUser();
    if (!caller?.id) return { success: false, error: "Unauthorized" };

    await prisma.follow.deleteMany({
      where: { followerId: caller.id, followingId },
    });

    revalidatePath("/dashboard/community");
    return { success: true };
  } catch (error) {
    logger.error({ event: "community.unfollow_failed", err: error }, "Unfollow failed");
    return { success: false, error: "Failed to unfollow user." };
  }
}
