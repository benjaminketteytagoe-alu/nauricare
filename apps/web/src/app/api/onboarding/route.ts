import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // 1. Authenticate the request
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Parse the incoming form data
    const body = await req.json();
    const { country, menstrualCycle, emergencyContact } = body;

    if (!country) {
      return new NextResponse("Country is required", { status: 400 });
    }

    // 3. Create the Patient Profile linked to the User
    const profile = await prisma.patientProfile.create({
      data: {
        userId: session.user.id,
        country,
        menstrualCycle: menstrualCycle || null,
        emergencyContact: emergencyContact || null,
      },
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    console.error("[ONBOARDING_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
