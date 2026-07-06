import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET: returns prescriptions scoped to the caller's role.
// PATIENT → their own received prescriptions (all statuses).
// PROVIDER → prescriptions they have issued.
// ADMIN → all prescriptions.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    const userId = session.user.id;

    const prescriptions = await prisma.prescription.findMany({
      where:
        role === "PATIENT"
          ? { patientId: userId }
          : role === "PROVIDER"
            ? { providerId: userId }
            : {},
      orderBy: { createdAt: "desc" },
      include: {
        patient: { select: { id: true, name: true, email: true } },
        provider: { select: { id: true, name: true } },
        pharmacy: { select: { id: true, name: true, address: true } },
        appointment: { select: { id: true, startTime: true } },
      },
    });

    return NextResponse.json(prescriptions);
  } catch (error) {
    console.error("[PRESCRIPTIONS_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
