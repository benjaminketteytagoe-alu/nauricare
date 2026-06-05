import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// NEW: Fetch all providers
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const providers = await prisma.user.findMany({
      where: { role: "PROVIDER" },
      include: { practitionerProfile: true },
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

    const body = await req.json();
    const { name, email, password, specialty, location, clinicName } = body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

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
      include: { practitionerProfile: true }
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
