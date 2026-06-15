import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// --- CURATED MEDICAL CONTENT LIBRARY ---
const CONTENT_DB = {
  "PCOS": {
    habits: [
      { id: 1, title: "Take Supplements (Inositol/Vitamin D)", desc: "Helps improve insulin sensitivity." },
      { id: 2, title: "Eat a High-Fiber, Low-GI Breakfast", desc: "Crucial for managing PCOS blood sugar spikes." }
    ],
    article: { title: "The Link Between Insulin Resistance and PCOS", url: "/dashboard/articles/pcos-insulin" }
  },
  "Fibroids": {
    habits: [
      { id: 3, title: "Drink Green Tea (EGCG)", desc: "Antioxidants may help reduce fibroid cellular growth." },
      { id: 4, title: "Limit Processed Red Meats", desc: "Reduces inflammatory markers linked to fibroids." }
    ],
    article: { title: "How to Manage Fibroid Pain Naturally at Home", url: "/dashboard/articles/fibroid-pain" }
  },
  "Endometriosis": {
    habits: [
      { id: 5, title: "Take Omega-3 Supplements", desc: "Helps manage and reduce systemic inflammation." },
      { id: 6, title: "Anti-Inflammatory Dinner", desc: "Focus on leafy greens and avoid refined sugars." }
    ],
    article: { title: "Navigating Endometriosis Flare-ups: A Guide", url: "/dashboard/articles/endo-flare" }
  },
  "General": {
    habits: [
      { id: 7, title: "Drink 2.5L of Water", desc: "Supports liver function to clear excess estrogen." },
      { id: 8, title: "30 Mins of Gentle Movement", desc: "Reduces cortisol levels without over-stressing the body." }
    ],
    article: { title: "The Foundations of Hormonal Balance", url: "/dashboard/articles/hormone-basics" }
  }
};

// GET: Generate the tailored dashboard payload
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const profile = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
      select: { healthGoals: true },
    });

    if (!profile) return new NextResponse("Profile not found", { status: 404 });

    const goals = profile.healthGoals;

    // --- Habits: still driven by the local content map (no Habit content model in schema) ---
    const activeGoals = goals.length > 0 ? goals : ["General"];
    let tailoredHabits: any[] = [];

    activeGoals.forEach((goal) => {
      const content = CONTENT_DB[goal as keyof typeof CONTENT_DB] || CONTENT_DB["General"];
      tailoredHabits = [...tailoredHabits, ...content.habits];
    });

    if (tailoredHabits.length < 4) {
      tailoredHabits = [...tailoredHabits, ...CONTENT_DB["General"].habits];
    }

    // --- Articles: fetched from the database ---
    // Primary: articles whose tags intersect with the patient's health goals
    let dbArticles = goals.length > 0
      ? await prisma.article.findMany({
          where: { isPublished: true, tags: { hasSome: goals } },
          orderBy: { createdAt: "desc" },
          take: 3,
          select: { id: true, title: true },
        })
      : [];

    // Fallback: if no goal-matched articles exist, surface the 3 most recent published articles
    if (dbArticles.length === 0) {
      dbArticles = await prisma.article.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, title: true },
      });
    }

    return NextResponse.json({
      healthGoals: profile.healthGoals,
      habits: tailoredHabits.slice(0, 4).map((h) => ({ ...h, done: false })),
      articles: dbArticles.map((a) => ({
        title: a.title,
        url: `/dashboard/articles/${a.id}`,
      })),
    });
  } catch (error) {
    console.error("[GET_PERSONALIZATION_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// POST: Save new preferences from the Settings page
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const { healthGoals } = body;

    const updatedProfile = await prisma.patientProfile.update({
      where: { userId: session.user.id },
      data: { healthGoals },
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error("[POST_PERSONALIZATION_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
