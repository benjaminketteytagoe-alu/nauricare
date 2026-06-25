import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // 1. Authenticate the request
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PATIENT") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Parse the payload from the frontend pen icon modal
    const body = await req.json();
    const { startDate } = body;

    if (!startDate) {
      return new NextResponse("Start date is required", { status: 400 });
    }

    // 3. Find the PatientProfile ID linked to this user
    const profile = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return new NextResponse("Patient profile not found. Please complete onboarding.", { status: 404 });
    }

    // 4. Create the new historical CycleLog entry
    const cycleLog = await prisma.cycleLog.create({
      data: {
        patientProfileId: profile.id,
        startDate: new Date(startDate),
      },
    });

    return NextResponse.json(cycleLog, { status: 201 });
  } catch (error) {
    console.error("[CYCLE_LOG_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
