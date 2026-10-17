import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { runTriage, toLegacyRiskLevel } from "@/lib/triage/engine";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

const SymptomInput = z.object({
  symptoms: z.array(z.string().trim().min(1).max(60)).min(1, "Select at least one symptom.").max(20),
  cycleDay: z.coerce.number().int().min(0).max(100).catch(0),
  notes: z.string().max(2000, "Notes must be under 2000 characters.").default(""),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // AI triage is an LLM call — rate-limit distinctly from generic API abuse.
    const limit = rateLimit(`symptoms-ai:${session.user.id}`, 10, 10 * 60_000);
    if (!limit.allowed) return rateLimitResponse(limit);

    const body = await req.json().catch(() => null);
    const parsed = SymptomInput.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { symptoms, cycleDay, notes } = parsed.data;

    const triage = await runTriage({ symptoms, cycleDay, notes });

    const newSymptomLog = await prisma.symptomCheck.create({
      data: {
        userId: session.user.id,
        answers: { symptoms, cycleDay, notes, triage: { ...triage } },
        riskLevel: toLegacyRiskLevel(triage.severity),
      },
    });

    return NextResponse.json(
      {
        message: "Symptoms logged successfully",
        log: newSymptomLog,
        aiInsight: triage.summary,
        triage,
      },
      { status: 201 },
    );

  } catch (error) {
    console.error("Detailed Backend Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Failed to process symptoms. Check terminal for details." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const logs = await prisma.symptomCheck.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return NextResponse.json({ logs }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
