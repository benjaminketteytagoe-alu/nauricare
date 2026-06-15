import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdministrativeAction } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROVIDER") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const patientProfileId = new URL(req.url).searchParams.get("patientProfileId");
    if (!patientProfileId) {
      return new NextResponse("Missing patientProfileId", { status: 400 });
    }

    const practitioner = await prisma.practitionerProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!practitioner) {
      return new NextResponse("Practitioner profile not found", { status: 404 });
    }

    // Gate: the provider must have at least one appointment with this patient
    const sharedAppointment = await prisma.appointment.findFirst({
      where: {
        practitionerProfileId: practitioner.id,
        patientProfileId,
      },
    });
    if (!sharedAppointment) {
      return new NextResponse("Forbidden: no active patient relationship", { status: 403 });
    }

    const records = await prisma.healthRecord.findMany({
      where: { patientProfileId },
      orderBy: { createdAt: "desc" },
    });

    // Fire-and-forget: audit failures must never block the response
    void logAdministrativeAction({
      action: "RECORD_ACCESS",
      actorId: session.user.id,
      targetId: patientProfileId,
      details: {
        practitionerProfileId: practitioner.id,
        recordCount: records.length,
      },
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error("[EHR_GET_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROVIDER") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { patientProfileId, type, content } = await req.json();

    const practitioner = await prisma.practitionerProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!practitioner) return new NextResponse("Practitioner not found", { status: 404 });

    const record = await prisma.healthRecord.create({
      data: {
        patientProfileId: patientProfileId, 
        practitionerProfileId: practitioner.id,
        type: type, 
        content: content, 
      }
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("[EHR_POST_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
