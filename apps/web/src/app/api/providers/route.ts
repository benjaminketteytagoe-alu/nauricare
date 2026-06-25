// apps/web/src/app/api/providers/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Securely fetch ONLY verified practitioner profiles
    const providers = await prisma.practitionerProfile.findMany({
      where: { 
        isVerified: true 
      },
      include: {
        // Attach the user's name and email for the directory cards
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(providers, { status: 200 });
  } catch (error) {
    console.error("Fetch Directory Error:", error);
    return NextResponse.json({ error: "Failed to fetch directory" }, { status: 500 });
  }
}
