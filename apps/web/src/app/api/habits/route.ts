import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { habitId, completed, date } = await req.json();
  
  if (habitId === undefined || !date) {
    return new NextResponse("Missing habitId or date", { status: 400 });
  }

  const patientProfile = await prisma.patientProfile.findUnique({
    where: { userId: session.user.id },
  });
  
  if (!patientProfile) {
    return new NextResponse("Profile not found", { status: 404 });
  }

  // Upsert enforces the unique constraint (patientProfileId, habitId, date)
  const log = await prisma.habitLog.upsert({
    where: {
      patientProfileId_habitId_date: {
        patientProfileId: patientProfile.id,
        habitId: Number(habitId),
        date: new Date(date),
      },
    },
    update: { completed },
    create: {
      patientProfileId: patientProfile.id,
      habitId: Number(habitId),
      date: new Date(date),
      completed,
    },
  });

  return NextResponse.json(log, { status: 200 });
}
