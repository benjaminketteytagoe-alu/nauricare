// apps/web/src/app/api/appointments/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PATIENT") {
      return new NextResponse("Unauthorized. Only patients can book appointments.", { status: 401 });
    }

    const body = await req.json();
    const { practitionerProfileId, startTime, endTime, notes } = body;

    if (!practitionerProfileId || !startTime || !endTime) {
      return new NextResponse("Missing required booking details.", { status: 400 });
    }

    const patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!patientProfile) return new NextResponse("Patient profile not found.", { status: 404 });

    const practitioner = await prisma.practitionerProfile.findUnique({
      where: { id: practitionerProfileId }
    });

    if (!practitioner) return new NextResponse("Practitioner not found.", { status: 404 });

    const appointment = await prisma.appointment.create({
      data: {
        patientProfileId: patientProfile.id,
        practitionerProfileId: practitioner.id,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        notes: notes || null,
        status: "PENDING",
      },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error("[APPOINTMENT_BOOKING_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// GET: Smart Router for fetching schedules
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    // --- SCENARIO A: The user is a DOCTOR (Provider) ---
    if (session.user.role === "PROVIDER") {
      const practitionerProfile = await prisma.practitionerProfile.findUnique({
        where: { userId: session.user.id }
      });
      if (!practitionerProfile) return NextResponse.json([]); // No profile yet

      const doctorSchedule = await prisma.appointment.findMany({
        where: { 
          practitionerProfileId: practitionerProfile.id,
          startTime: { gte: new Date() } // Only future appointments
        },
        include: {
          // Pull the patient's name and email so the doctor knows who they are seeing
          patient: { include: { user: { select: { name: true, email: true } } } }
        },
        orderBy: { startTime: 'asc' }
      });
      return NextResponse.json(doctorSchedule);
    }

    // --- SCENARIO B: The user is a PATIENT ---
    const patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!patientProfile) return NextResponse.json([]); 

    const patientSchedule = await prisma.appointment.findMany({
      where: { 
        patientProfileId: patientProfile.id,
        startTime: { gte: new Date() } 
      },
      include: {
        practitioner: { include: { user: { select: { name: true, email: true } } } }
      },
      orderBy: { startTime: 'asc' }
    });
    return NextResponse.json(patientSchedule);

  } catch (error) {
    console.error("[APPOINTMENT_FETCH_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
