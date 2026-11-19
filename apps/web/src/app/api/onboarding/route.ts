import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const onboardingSchema = z.object({
  country: z.string().trim().min(1, "Country is required"),
  menstrualCycle: z.string().trim().optional().nullable(),
  emergencyContact: z.string().trim().max(200).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    // 1. Authenticate the request
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse the incoming form data
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = onboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { country, menstrualCycle, emergencyContact, dateOfBirth } = parsed.data;

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
