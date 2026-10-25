// apps/web/src/app/api/providers/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 
import { prisma } from "@/lib/prisma";
import { isOnline } from "@/server/messaging/policy";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Securely fetch ONLY verified, active (non-deleted) practitioner profiles
    const providers = await prisma.practitionerProfile.findMany({
      where: {
        isVerified: true,
        isActive: true,
      },
      // Explicit fields only: the directory never needs contact emails or audit data.
      select: {
        id: true,
        specialty: true,
        clinicName: true,
        location: true,
        bio: true,
        yearsExperience: true,
        latitude: true,
        longitude: true,
        user: { select: { id: true, name: true, avatarUrl: true, lastSeenAt: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const directory = providers.map(({ user: { lastSeenAt, ...user }, ...p }) => ({ ...p, user, online: isOnline(lastSeenAt) }));
    return NextResponse.json(directory, { status: 200 });
  } catch (error) {
    console.error("Fetch Directory Error:", error);
    return NextResponse.json({ error: "Failed to fetch directory" }, { status: 500 });
  }
}
