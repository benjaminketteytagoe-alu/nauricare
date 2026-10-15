import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { logAdministrativeAction } from "@/lib/audit";

const createRecordSchema = z.object({
  patientProfileId: z.string().min(1),
  type: z.string().trim().min(1).max(100),
  content: z.string().trim().min(1).max(10_000),
  notes: z.string().trim().max(5_000).optional(),
  documentUrl: z.url().optional(),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    // ── PATIENT path: patients can read their own records without a URL param ──
    if (session.user.role === "PATIENT") {
      const profile = await prisma.patientProfile.findUnique({
        where: { userId: session.user.id },
      });
      if (!profile) return new NextResponse("Patient profile not found", { status: 404 });

      const records = await prisma.healthRecord.findMany({
        where: { patientProfileId: profile.id },
        include: {
          practitioner: { include: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json(records);
    }

    // ── PROVIDER path: relationship-gated access to a specific patient ──
    if (session.user.role !== "PROVIDER") {
      return new NextResponse("Forbidden", { status: 403 });
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
      include: {
        practitioner: { include: { user: { select: { name: true } } } },
      },
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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new NextResponse("Invalid JSON body", { status: 400 });
    }

    const parsed = createRecordSchema.safeParse(body);
    if (!parsed.success) {
      return new NextResponse(parsed.error.issues[0].message, { status: 400 });
    }
    const { patientProfileId, type, content, notes, documentUrl } = parsed.data;

    const practitioner = await prisma.practitionerProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!practitioner) return new NextResponse("Practitioner not found", { status: 404 });

    // BOLA guard: a provider may only write a record for a patient they have
    // an actual appointment relationship with — without this, any provider
    // could write clinical records against any patient in the system.
    const sharedAppointment = await prisma.appointment.findFirst({
      where: { practitionerProfileId: practitioner.id, patientProfileId },
    });
    if (!sharedAppointment) {
      return new NextResponse("Forbidden: no active patient relationship", { status: 403 });
    }

    const record = await prisma.healthRecord.create({
      data: {
        patientProfileId,
        practitionerProfileId: practitioner.id,
        type,
        content,
        notes: notes || null,
        documentUrl: documentUrl || null,
      }
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("[EHR_POST_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
