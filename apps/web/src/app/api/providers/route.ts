import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // Allow any authenticated user (Patient or otherwise) to view the directory
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch only providers and their public profiles
    const providers = await prisma.user.findMany({
      where: { role: "PROVIDER" },
      include: { practitionerProfile: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(providers, { status: 200 });
  } catch (error) {
    console.error("Fetch Directory Error:", error);
    return NextResponse.json({ error: "Failed to fetch directory" }, { status: 500 });
  }
}
