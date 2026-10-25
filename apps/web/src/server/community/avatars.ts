import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { communityAvatar, presetIdOf } from "@/lib/avatars";

// Community avatar policy: patients appear with a predefined avatar only
// (never an uploaded or Google photo) and must choose one before posting.

type WithAuthor = { author: { role: string; avatarUrl: string | null } };

/** Replace a patient author's avatar with their community-safe avatar (or none). */
export function scrubAuthor<T extends WithAuthor>(item: T): T {
  return { ...item, author: { ...item.author, avatarUrl: communityAvatar(item.author.role, item.author.avatarUrl) } };
}

/** 409 AVATAR_REQUIRED when a patient without a predefined avatar tries to post. */
export async function requireCommunityAvatar(userId: string): Promise<NextResponse | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, avatarUrl: true } });
  if (!user || user.role !== "PATIENT" || presetIdOf(user.avatarUrl)) return null;
  return NextResponse.json(
    { error: "Choose a community avatar before posting.", code: "AVATAR_REQUIRED" },
    { status: 409 },
  );
}
