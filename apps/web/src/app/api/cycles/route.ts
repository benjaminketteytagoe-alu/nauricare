import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseJson } from "@/lib/api";

const CycleInput = z.object({
  startDate: z
    .string()
    .max(40)
    .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid start date.")
    .refine((v) => Date.parse(v) <= Date.now() + 24 * 60 * 60_000, "The start date can't be in the future.")
    .refine((v) => Date.parse(v) >= Date.parse("2000-01-01"), "Enter a valid start date."),
});

export async function POST(req: Request) {
  try {
    // 1. Authenticate the request
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PATIENT") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Parse the payload from the frontend pen icon modal
    const parsed = await parseJson(req, CycleInput);
    if (!parsed.ok) return parsed.response;
    const { startDate } = parsed.data;

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
