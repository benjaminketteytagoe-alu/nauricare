import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // 1. Authenticate the request
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse the incoming form data
    const body = await req.json();
    const { country, menstrualCycle, emergencyContact, dateOfBirth } = body;

    if (!country) {
      return NextResponse.json({ error: "Country is required" }, { status: 400 });
    }

    // Parse dateOfBirth safely — Google OAuth users often omit this field
    const parsedDob = dateOfBirth ? new Date(dateOfBirth) : null;
    const validDob = parsedDob && !isNaN(parsedDob.getTime()) ? parsedDob : null;

    if (validDob) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { dateOfBirth: validDob },
      });
    }

    // 3. Upsert the Patient Profile — idempotent for double-submits and
    //    Google OAuth re-entries where the profile already exists.
    const profile = await prisma.patientProfile.upsert({
      where: { userId: session.user.id },
      update: {
        country,
        menstrualCycle: menstrualCycle || null,
        emergencyContact: emergencyContact || null,
      },
      create: {
        userId: session.user.id,
        country,
        menstrualCycle: menstrualCycle || null,
        emergencyContact: emergencyContact || null,
      },
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[ONBOARDING_ERROR]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
