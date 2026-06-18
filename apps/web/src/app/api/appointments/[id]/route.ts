import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {

    const resolvedParams = await params;
    const appointmentId = resolvedParams.id;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { include: { user: { select: { name: true, email: true } } } },
        practitioner: { include: { user: { select: { name: true, email: true } } } }
      }
    });

    if (!appointment) return new NextResponse("Appointment not found", { status: 404 });

    // SECURITY CHECK: Ensure the logged-in user belongs to this specific appointment
    const isPatient = appointment.patient.userId === session.user.id;
    const isProvider = appointment.practitioner.userId === session.user.id;

    if (!isPatient && !isProvider) {
      return new NextResponse("Forbidden: You do not have access to this telehealth room.", { status: 403 });
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("[TELEHEALTH_AUTH_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
