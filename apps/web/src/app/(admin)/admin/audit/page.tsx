import { AuditAction } from "@prisma/client";
import { ChevronLeft, ChevronRight, Download, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

// Every staff and security action the app records (lib/audit, staff tool,
// sign-in codes). AuditEvent is only the background jobs' heartbeat.
const ACTION_TONE: Partial<Record<AuditAction, string>> = {
  PROVIDER_VERIFY: "bg-success-soft text-success border-success-line",
  PROVIDER_SUSPEND: "bg-danger-soft text-danger border-danger-line",
  ACCOUNT_DELETED: "bg-danger-soft text-danger border-danger-line",
  STAFF_ACCESS_CHANGE: "bg-warning-soft text-warning border-warning-line",
  DATA_EXPORT: "bg-warning-soft text-warning border-warning-line",
  PROVIDER_REGISTER: "bg-brand-soft text-brand-ink border-brand-line",
};

const label = (a: string) => a.toLowerCase().replace(/_/g, " ");

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "Africa/Kigali",
});

interface PageProps {
  searchParams: Promise<{ page?: string; action?: string }>;
}

export default async function AdminAuditPage({ searchParams }: PageProps) {
  await requireRole("ADMIN");
  const params = await searchParams;
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);
  const action = (Object.values(AuditAction) as string[]).includes(params.action ?? "")
    ? (params.action as AuditAction)
    : undefined;
  const where = action ? { action } : {};

  const [allActions, total, logs] = await Promise.all([
    prisma.auditLog.groupBy({ by: ["action"], _count: { action: true } }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        action: true,
        targetId: true,
        ipAddress: true,
        details: true,
        createdAt: true,
        actor: { select: { name: true, email: true } },
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number, a = action) => {
    const q = new URLSearchParams();
    if (a) q.set("action", a);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return `/admin/audit${s ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Compliance"
        title="Audit log"
        description="Every staff and security action: approvals, sign-ins, exports, access changes and deletions. Entries can't be edited."
        actions={
          // A plain link: the attachment header makes the browser download it.
          <a
            href="/api/admin/audit-logs/export"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-field bg-surface px-5 text-sm font-medium text-ink hover:bg-surface-muted"
          >
            <Download className="size-4" aria-hidden />
            Export CSV (latest 1,000)
          </a>
        }
      />

      <nav aria-label="Filter by action" className="flex flex-wrap gap-2">
        {[{ action: undefined as string | undefined, count: undefined as number | undefined }]
          .concat(
            allActions
              .sort((a, b) => b._count.action - a._count.action)
              .map((a) => ({ action: a.action as string, count: a._count.action })),
          )
          .map((f) => {
            const active = f.action === action;
            return (
              <Link
                key={f.action ?? "all"}
                href={href(1, f.action as AuditAction | undefined)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium capitalize",
                  active
                    ? "border-brand bg-brand text-on-brand"
                    : "border-hairline bg-surface text-ink-soft hover:bg-surface-muted",
                )}
              >
                {f.action ? `${label(f.action)} · ${f.count}` : "All"}
              </Link>
            );
          })}
      </nav>

      {logs.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nothing recorded yet"
          description="Staff and security actions appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Audit log, page {page} of {pages}
              </caption>
              <thead className="border-b border-hairline bg-surface-muted text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">
                    When (Kigali)
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Action
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    By
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Target
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    IP
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-ink-soft">
                {logs.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs">{dateFmt.format(log.createdAt)}</td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                          ACTION_TONE[log.action] ?? "border-hairline bg-surface-muted text-ink-soft",
                        )}
                      >
                        {label(log.action)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <div className="font-medium text-ink">{log.actor.name}</div>
                      <div className="text-xs text-ink-muted">{log.actor.email}</div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs" title={log.targetId ?? undefined}>
                      {log.targetId ? `${log.targetId.slice(0, 12)}…` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs">{log.ipAddress ?? "—"}</td>
                    <td className="max-w-md px-5 py-3">
                      {log.details ? (
                        <pre className="max-h-32 overflow-auto rounded-md bg-surface-muted p-2 font-mono text-xs text-ink-soft">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-xs text-ink-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm text-ink-soft">
          <span>
            Page {page} of {pages} · {total.toLocaleString("en-GB")} entries
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={href(page - 1)}
                className="inline-flex items-center gap-1 rounded-full border border-hairline bg-surface px-3 py-1.5 hover:bg-surface-muted"
              >
                <ChevronLeft className="size-4" aria-hidden /> Newer
              </Link>
            )}
            {page < pages && (
              <Link
                href={href(page + 1)}
                className="inline-flex items-center gap-1 rounded-full border border-hairline bg-surface px-3 py-1.5 hover:bg-surface-muted"
              >
                Older <ChevronRight className="size-4" aria-hidden />
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
