import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const VALID_CATEGORIES = new Set(["GENERAL", "BUG_REPORT", "FEATURE_REQUEST", "PROVIDER_EXPERIENCE", "BILLING"]);
const VALID_STATUSES = new Set(["NEW", "REVIEWED", "ACTIONED"]);

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const url = new URL(req.url);
  const ratingParam = url.searchParams.get("rating");
  const categoryParam = url.searchParams.get("category");
  const statusParam = url.searchParams.get("status");
  const search = url.searchParams.get("search")?.trim();

  const where: Prisma.FeedbackWhereInput = {};

  const rating = ratingParam ? Number(ratingParam) : null;
  if (rating && rating >= 1 && rating <= 5) where.rating = rating;

  if (categoryParam && VALID_CATEGORIES.has(categoryParam)) {
    where.category = categoryParam as Prisma.FeedbackWhereInput["category"];
  }
  if (statusParam && VALID_STATUSES.has(statusParam)) {
    where.status = statusParam as Prisma.FeedbackWhereInput["status"];
  }
  if (search) {
    where.comment = { contains: search, mode: "insensitive" };
  }

  const [items, total, avgAgg, satisfiedCount, categoryGroups, statusGroups] = await Promise.all([
    prisma.feedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { name: true, email: true, role: true } } },
    }),
    prisma.feedback.count(),
    prisma.feedback.aggregate({ _avg: { rating: true } }),
    prisma.feedback.count({ where: { rating: { gte: 4 } } }),
    prisma.feedback.groupBy({ by: ["category"], _count: { _all: true } }),
    prisma.feedback.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  return NextResponse.json({
    items,
    stats: {
      total,
      averageRating: avgAgg._avg.rating ?? 0,
      csatPercent: total > 0 ? Math.round((satisfiedCount / total) * 100) : 0,
      byCategory: Object.fromEntries(categoryGroups.map((g) => [g.category, g._count._all])),
      byStatus: Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all])),
    },
  });
}
