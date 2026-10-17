import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseJson } from "@/lib/api";
import { sanitizePlainText } from "@/lib/sanitize";

const PharmacyInput = z.object({
  name: z.string().trim().min(1, "name and address are required").max(200),
  address: z.string().trim().min(1, "name and address are required").max(300),
  contactEmail: z.union([z.literal(""), z.email("Enter a valid contact email")]).optional().or(z.null()),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional().or(z.null()),
});

export async function GET() {
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
    console.error("[PHARMACY_GET_ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch pharmacies" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const parsed = await parseJson(req, PharmacyInput);
    if (!parsed.ok) return parsed.response;
    const { contactEmail, tags } = parsed.data;

    const newPharmacy = await prisma.pharmacy.create({
      data: {
        name: sanitizePlainText(parsed.data.name),
        address: sanitizePlainText(parsed.data.address),
        contactEmail: contactEmail || null,
        tags: (tags ?? []).map(sanitizePlainText).filter(Boolean),
      },
    });

    await prisma.auditEvent.create({
      data: {
        userId: session.user.id,
        action: "ADD_PHARMACY",
        details: { pharmacyId: newPharmacy.id, name: newPharmacy.name },
      },
    });

    return NextResponse.json(newPharmacy, { status: 201 });
  } catch (error) {
    console.error("[PHARMACY_POST_ERROR]", error);
    return NextResponse.json({ error: "Failed to add pharmacy" }, { status: 500 });
  }
}
