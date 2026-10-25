"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-guards";
import { AVATAR_PRESET_IDS, isGooglePhoto, presetSrc } from "@/lib/avatars";
import { recordPatientActivity } from "@/server/activity/activity.service";

const AvatarChoice = z.union([
  z.object({ preset: z.enum(AVATAR_PRESET_IDS) }).strict(),
  z.object({ google: z.literal(true) }).strict(),
]);

/**
 * Set the signed-in user's avatar to a predefined avatar or their own synced
 * Google photo. Arbitrary URLs and uploads are not accepted.
 */
export async function chooseAvatar(input: z.infer<typeof AvatarChoice>): Promise<{ success: true; avatarUrl: string } | { success: false; error: string }> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Unauthorized" };
  const parsed = AvatarChoice.safeParse(input);
  if (!parsed.success) return { success: false, error: "Please choose one of the avatars shown." };

  let avatarUrl: string;
  if ("preset" in parsed.data) {
    avatarUrl = presetSrc(parsed.data.preset);
  } else {
    const row = await prisma.user.findUnique({ where: { id: user.id }, select: { googlePhotoUrl: true } });
    if (!isGooglePhoto(row?.googlePhotoUrl)) return { success: false, error: "No Google photo is linked to your account." };
    avatarUrl = row!.googlePhotoUrl!;
  }

  try {
    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl } });
    await recordPatientActivity(user.role, { userId: user.id, type: "PROFILE_UPDATED", title: "Changed avatar" });
    revalidatePath("/dashboard", "layout");
    return { success: true, avatarUrl };
  } catch (error) {
    console.error("[CHOOSE_AVATAR_ERROR]", error);
    return { success: false, error: "Failed to update your avatar." };
  }
}
