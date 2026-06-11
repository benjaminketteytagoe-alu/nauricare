import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// NEW: Fetch all partner pharmacies
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const pharmacies = await prisma.pharmacy.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(pharmacies, { status: 200 });
  } catch (error) {
    console.error("Fetch Pharmacies Error:", error);
    return NextResponse.json({ error: "Failed to fetch pharmacies" }, { status: 500 });
  }
}

// EXISTING: Create a new pharmacy
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { name, location, contactInfo, tags } = body; 

    const newPharmacy = await prisma.pharmacy.create({
      data: {
        name,
        location,
        contactInfo,
        tags: tags || [], 
      }
    });

    await prisma.auditEvent.create({
      data: {
        userId: session.user.id,
        action: "ADD_PHARMACY",
        details: { pharmacyId: newPharmacy.id, name: newPharmacy.name }
      }
    });

    return NextResponse.json(newPharmacy, { status: 201 });
  } catch (error) {
    console.error("Pharmacy Creation Error:", error);
    return NextResponse.json({ error: "Failed to add pharmacy" }, { status: 500 });
  }
}
