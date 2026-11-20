import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { logAdministrativeAction } from "@/lib/audit";
import { requireApiUser } from "@/lib/auth-guards";
import { getClientIp } from "@/lib/getClientIp";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value).replace(/"/g, '""');
  return /[,"\n\r]/.test(str) ? `"${str}"` : str;
}

export async function GET(req: Request) {
  const auth = await requireApiUser("ADMIN");
  if (!auth.ok) return auth.response;
  // Exports are bulk reads of personal data: keep them rare and audited.
  const limited = enforceRateLimit(`audit-export:${auth.user.id}`, 10, 60 * 60_000);
  if (limited) return limited;

  return handle(async () => {
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
      ].join(","),
    );

    const csv = [header, ...rows].join("\r\n");

    await logAdministrativeAction({
      action: "DATA_EXPORT",
      actorId: auth.user.id,
      ipAddress: getClientIp(req.headers),
      details: { export: "audit_log", rows: logs.length },
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        // Content-Disposition: attachment tells the browser to download the
        // response as a file rather than rendering it in the tab.
        "Content-Disposition": `attachment; filename="nauricare-compliance-audit-${Date.now()}.csv"`,
      },
    });
  });
}
