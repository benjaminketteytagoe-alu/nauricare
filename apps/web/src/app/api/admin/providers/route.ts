import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { passwordField } from "@/lib/validation/password";
import bcrypt from "bcryptjs";

const onboardProviderSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().trim(),
  password: passwordField,
  specialty: z.string().trim().min(2).max(100),
  location: z.string().trim().min(1).max(200),
  // Required — PractitionerProfile.clinicName is a non-nullable DB column.
  clinicName: z.string().trim().min(1, "Clinic name is required").max(150),
});

// NEW: Fetch all providers
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // select (not include) — an unscoped include on User pulls every scalar
    // field, including passwordHash, straight into the JSON response.
    const providers = await prisma.user.findMany({
      where: { role: "PROVIDER" },
      select: {
        id: true,
        name: true,
        email: true,
        isVerified: true,
        createdAt: true,
        practitionerProfile: {
          select: { specialty: true, clinicName: true, location: true, isVerified: true, isActive: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(providers, { status: 200 });
  } catch (error) {
    console.error("Fetch Providers Error:", error);
    return NextResponse.json({ error: "Failed to fetch providers" }, { status: 500 });
  }
}

// EXISTING: Create a new provider
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = onboardProviderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { name, email, password, specialty, location, clinicName } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // select (not include) — see GET above: an unscoped include on User
    // returns passwordHash straight into the JSON response.
    const newProvider = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "PROVIDER",
        isVerified: true,
        practitionerProfile: {
          create: {
            specialty,
            location,
            clinicName,
            isVerified: true,
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        isVerified: true,
        practitionerProfile: {
          select: { specialty: true, clinicName: true, location: true, isVerified: true, isActive: true },
        },
      },
    });

    await prisma.auditEvent.create({
      data: {
        userId: session.user.id,
        action: "ONBOARD_PROVIDER",
        details: { providerId: newProvider.id, email: newProvider.email }
      }
    });

    return NextResponse.json(newProvider, { status: 201 });
  } catch (error) {
    console.error("Provider Onboarding Error:", error);
    return NextResponse.json({ error: "Failed to onboard provider" }, { status: 500 });
  }
}
