import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET: returns all partner pharmacies for the routing dropdown.
// Any authenticated role may call this.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pharmacies = await prisma.pharmacy.findMany({
      select: { id: true, name: true, address: true, contactEmail: true, tags: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(pharmacies);
  } catch (error) {
    console.error("[PHARMACIES_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
