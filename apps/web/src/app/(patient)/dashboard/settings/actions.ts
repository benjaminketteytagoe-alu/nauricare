"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateAvatar(avatarUrl: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    if (!avatarUrl.startsWith("https://")) {
      return { success: false, error: "Invalid avatar URL" };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/community");

    return { success: true };
  } catch (error) {
    console.error("[UPDATE_AVATAR_ERROR]", error);
    return { success: false, error: "Failed to update profile picture." };
  }
}
