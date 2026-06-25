import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PATIENT") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const profile = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return new NextResponse("Patient profile not found", { status: 404 });
    }

    const latestLog = await prisma.cycleLog.findFirst({
      where: { patientProfileId: profile.id },
      orderBy: { startDate: "desc" },
    });

    // Fall back to the profile's saved average (e.g. "28"), defaulting to 28.
    // This must apply whenever a log doesn't carry its own cycleLength — which is
    // always true today, since the logging modal only ever submits a startDate.
    const parsed = parseInt(profile.menstrualCycle ?? "", 10);
    const profileCycleLength = Number.isFinite(parsed) ? parsed : 28;

    if (!latestLog) {
      return NextResponse.json({
        cycleLength: profileCycleLength,
        lastPeriodDate: null,
      });
    }

    return NextResponse.json({
      cycleLength: latestLog.cycleLength ?? profileCycleLength,
      lastPeriodDate: latestLog.startDate.toISOString(),
    });
  } catch (error) {
    console.error("[CYCLE_LATEST_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
