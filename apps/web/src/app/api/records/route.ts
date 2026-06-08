import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
