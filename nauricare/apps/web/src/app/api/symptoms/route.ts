import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { symptoms, cycleDay, notes } = await req.json();

    const systemPrompt = "You are an empathetic, educational health assistant for NauriCare. " +
      "A patient has logged the following daily symptoms: " + JSON.stringify(symptoms) + ". " +
      "They are on day " + cycleDay + " of their menstrual cycle. " +
      "Additional notes: \"" + notes + "\".\n\n" +
      "YOUR RULES:\n" +
      "1. DO NOT DIAGNOSE. You are an educator, not a doctor.\n" +
      "2. Provide a short, empathetic insight explaining why these symptoms might occur at this stage.\n" +
      "3. Determine a 'riskLevel' (Low, Medium, High).\n" +
      "4. Return ONLY a valid JSON object with no markdown formatting.\n\n" +
      "JSON FORMAT:\n" +
      "{\n" +
      "  \"riskLevel\": \"Low\" | \"Medium\" | \"High\",\n" +
      "  \"insight\": \"Your empathetic, educational response here.\"\n" +
      "}";

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text();

    // Safely look up the precise user ID from the database using their session email
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 });
    }

    let aiAnalysis;
    try {
      const t = String.fromCharCode(96, 96, 96);
      
      const cleanJsonString = responseText
        .split(t + "json").join("")
        .split(t).join("")
        .trim();
        
      aiAnalysis = JSON.parse(cleanJsonString);
    } catch (parseError) {
      console.error("JSON Parse Error. Raw AI Output:", responseText);
      aiAnalysis = { 
        riskLevel: "Medium", 
        insight: "We logged your symptoms securely, but our AI couldn't generate a personalized insight at this moment." 
      };
    }

    const newSymptomLog = await prisma.symptomCheck.create({
      data: {
        userId: dbUser.id, // Now using the guaranteed ID from the database!
        answers: { symptoms, cycleDay, notes },
        riskLevel: aiAnalysis.riskLevel,
      },
    });

    return NextResponse.json(
      { 
        message: "Symptoms logged successfully", 
        log: newSymptomLog,
        aiInsight: aiAnalysis.insight 
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("Detailed Backend Error:", error.message || error);
    return NextResponse.json(
      { error: "Failed to process symptoms. Check terminal for details." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
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
