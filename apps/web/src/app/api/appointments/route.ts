import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Ensure only logged-in patients can book
    if (!session?.user?.id || session.user.role !== "PATIENT") {
      return NextResponse.json({ error: "Unauthorized. Only patients can book appointments." }, { status: 403 });
    }

    const body = await req.json();
    const { practitionerId, date, reason } = body;

    // 1. Generate a unique, secure Jitsi meeting ID and URL
    const meetingId = `NauriCare-${randomUUID().slice(0, 8)}`;
    const videoUrl = `https://meet.jit.si/${meetingId}`;

    // 2. Save the appointment to the database
    const appointment = await prisma.appointment.create({
      data: {
        patientId: session.user.id,
        practitionerId: practitionerId,
        date: new Date(date),
        status: "SCHEDULED",
        videoUrl: videoUrl,
        meetingId: meetingId,
	type: "VIDEO_CONSULTATION",
      }
    });

    // 3. Log the event for the Admin Audit Logs!
    await prisma.auditEvent.create({
      data: {
        userId: session.user.id,
        action: "BOOK_APPOINTMENT",
        details: { appointmentId: appointment.id, providerId: practitionerId }
      }
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error("Booking Error:", error);
    return NextResponse.json({ error: "Failed to book appointment" }, { status: 500 });
  }
}
