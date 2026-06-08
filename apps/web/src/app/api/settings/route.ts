import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Fetch all user preferences for the settings UI
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const profile = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: { select: { name: true, email: true, phoneNumber: true } }
      }
    });

    if (!profile) return new NextResponse("Profile not found", { status: 404 });

    return NextResponse.json({
      name: profile.user.name,
      email: profile.user.email,
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

    const body = await req.json();
    const { healthGoals, menstrualCycle, emergencyContact } = body;

    const updatedProfile = await prisma.patientProfile.update({
      where: { userId: session.user.id },
      data: { 
        healthGoals,
        menstrualCycle: menstrualCycle.toString(),
        emergencyContact
      },
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error("[POST_SETTINGS_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
