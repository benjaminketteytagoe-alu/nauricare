import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value).replace(/"/g, '""');
  return /[,"\n\r]/.test(str) ? `"${str}"` : str;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const logs = await prisma.auditLog.findMany({
      take: 1000,
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { email: true, name: true } } },
    });

    const header = "Date,User Email,User Name,Action,Target ID,IP Address,Details";
    const rows = logs.map((log) =>
      [
        csvEscape(log.createdAt.toISOString()),
        csvEscape(log.actor.email),
        csvEscape(log.actor.name),
        csvEscape(log.action),
        csvEscape(log.targetId),
        csvEscape(log.ipAddress),
        csvEscape(log.details ? JSON.stringify(log.details) : ""),
      ].join(",")
    );

    const csv = [header, ...rows].join("\r\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        // Content-Disposition: attachment tells the browser to download the
        // response as a file rather than rendering it in the tab.
        "Content-Disposition": `attachment; filename="nauricare-compliance-audit-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error("[AUDIT_EXPORT_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
