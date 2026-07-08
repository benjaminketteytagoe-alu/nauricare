"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function followUser(followingId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (session.user.id === followingId) {
      return { success: false, error: "You can't follow yourself." };
    }

    // Check existence before upsert so we only notify on a genuinely new follow.
    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: session.user.id, followingId } },
      select: { id: true },
    });

    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: session.user.id, followingId } },
      update: {},
      create: { followerId: session.user.id, followingId },
    });

    if (!existing) {
      void prisma.userNotification
        .create({ data: { recipientId: followingId, actorId: session.user.id, type: "FOLLOW" } })
        .catch((err) => console.error("[FOLLOW_NOTIFICATION_ERROR]", err));
    }

    revalidatePath("/dashboard/community");
    return { success: true };
  } catch (error) {
    console.error("[FOLLOW_USER_ERROR]", error);
    return { success: false, error: "Failed to follow user." };
  }
}

export async function unfollowUser(followingId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    await prisma.follow.deleteMany({
      where: { followerId: session.user.id, followingId },
    });

    revalidatePath("/dashboard/community");
    return { success: true };
  } catch (error) {
    console.error("[UNFOLLOW_USER_ERROR]", error);
    return { success: false, error: "Failed to unfollow user." };
  }
}
