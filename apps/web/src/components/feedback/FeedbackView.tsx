import type { Role } from "@prisma/client";
import { MessageSquarePlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import { formatDate } from "@/lib/format";
import { CSAT_SCALE, FEEDBACK_CATEGORY_LABELS } from "@/lib/feedback/categories";
import { StatusChip } from "@/components/ui/status-chip";
import { FeedbackForm } from "./FeedbackForm";

const STATUS = {
  NEW: { label: "Received", tone: "neutral" },
  REVIEWED: { label: "Reviewed by the team", tone: "primary" },
  ACTIONED: { label: "Acted on", tone: "success" },
} as const;

/** The Feedback tab: the form plus the signed-in user's own past submissions. */
export async function FeedbackView({ role }: { role: Role }) {
  const { user } = await requireRole(role);
  const history = await prisma.feedback.findMany({
    where: { userId: user.id },
    select: { id: true, rating: true, category: true, comment: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <header>
        <h1 className="flex items-center gap-3 text-2xl font-bold text-nc-ink sm:text-3xl"><MessageSquarePlus className="h-7 w-7 text-rose-600" aria-hidden /> Feedback</h1>
        <p className="mt-1 text-slate-600">Tell us what&apos;s working and what isn&apos;t. Every message is read by the NauriCare team.</p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <FeedbackForm />
        <section aria-labelledby="feedback-history" className="space-y-3">
          <h2 id="feedback-history" className="text-lg font-bold text-nc-ink">Your feedback</h2>
          {history.length === 0 ? (
            <p className="card-surface p-6 text-sm text-slate-500">You haven&apos;t sent any feedback yet.</p>
          ) : (
            <ul className="space-y-3">
              {history.map((f) => (
                <li key={f.id} className="card-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="flex items-center gap-2">
                      <span className="text-lg" aria-label={CSAT_SCALE.find((s) => s.value === f.rating)?.label}>{CSAT_SCALE.find((s) => s.value === f.rating)?.emoji}</span>
                      <span className="font-semibold text-slate-700">{FEEDBACK_CATEGORY_LABELS[f.category]}</span>
                      <span>· {formatDate(f.createdAt)}</span>
                    </span>
                    <StatusChip tone={STATUS[f.status].tone}>{STATUS[f.status].label}</StatusChip>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{f.comment}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
