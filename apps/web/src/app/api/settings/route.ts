import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/server/activity/activity.service";

const settingsSchema = z.object({
  healthGoals: z.array(z.string().max(100)).max(20),
  menstrualCycle: z.union([z.string(), z.number()]).optional(),
  emergencyContact: z.string().trim().max(200).optional().nullable(),
});

// GET: Fetch all user preferences for the settings UI
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const profile = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: { select: { name: true, email: true, phoneNumber: true, avatarUrl: true, googlePhotoUrl: true } }
      }
    });

    if (!profile) return new NextResponse("Profile not found", { status: 404 });

    return NextResponse.json({
      name: profile.user.name,
      email: profile.user.email,
      avatarUrl: profile.user.avatarUrl,
      googlePhotoUrl: profile.user.googlePhotoUrl,
      healthGoals: profile.healthGoals,
      menstrualCycle: profile.menstrualCycle || "28",
      emergencyContact: profile.emergencyContact || ""
    });
  } catch (error) {
    console.error("[GET_SETTINGS_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// POST: Save holistic settings
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new NextResponse("Invalid JSON body", { status: 400 });
    }

    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return new NextResponse(parsed.error.issues[0].message, { status: 400 });
    }
    const { healthGoals, menstrualCycle, emergencyContact } = parsed.data;

    const updatedProfile = await prisma.patientProfile.update({
      where: { userId: session.user.id },
      data: {
        healthGoals,
        menstrualCycle: menstrualCycle !== undefined ? menstrualCycle.toString() : undefined,
        emergencyContact,
      },
    });

    await recordActivity({ userId: session.user.id, type: "PROFILE_UPDATED", title: "Updated health profile settings" });
    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error("[POST_SETTINGS_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
