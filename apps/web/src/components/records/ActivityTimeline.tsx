"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity, Bot, CalendarCheck, ChevronDown, FileHeart, Hospital, Link2, Link2Off, LogIn,
  MessageSquareHeart, Pill, ShieldCheck, ShieldOff, UserCog, Droplet, Eye, type LucideIcon,
} from "lucide-react";
import type { PatientActivityType } from "@prisma/client";
import { Callout } from "@/components/ui/callout";
import { SEVERITY_TONE, StatusChip } from "@/components/ui/status-chip";
import { formatDate, formatTime } from "@/lib/format";

interface ActivityItem {
  id: string;
  type: PatientActivityType;
  title: string;
  details: Record<string, unknown> | null;
  refType: string | null;
  refId: string | null;
  createdAt: string;
}

const META: Record<PatientActivityType, { icon: LucideIcon; tint: string }> = {
  AI_TRIAGE: { icon: Bot, tint: "bg-nc-primary-container text-nc-primary" },
  APPOINTMENT_BOOKED: { icon: CalendarCheck, tint: "bg-emerald-50 text-emerald-700" },
  REFERRAL_CREATED: { icon: Hospital, tint: "bg-nc-amber-container text-nc-amber" },
  REFERRAL_SHARED: { icon: Link2, tint: "bg-nc-amber-container text-nc-amber" },
  REFERRAL_SHARE_REVOKED: { icon: Link2Off, tint: "bg-slate-100 text-slate-600" },
  REFERRAL_SHARE_OPENED: { icon: Eye, tint: "bg-nc-amber-container text-nc-amber" },
  INSURANCE_UPDATED: { icon: FileHeart, tint: "bg-slate-100 text-slate-600" },
  CONSENT_GRANTED: { icon: ShieldCheck, tint: "bg-nc-primary-container text-nc-primary" },
  CONSENT_WITHDRAWN: { icon: ShieldOff, tint: "bg-nc-berry-container text-nc-berry" },
  CYCLE_LOGGED: { icon: Droplet, tint: "bg-rose-50 text-rose-600" },
  PRESCRIPTION_ROUTED: { icon: Pill, tint: "bg-emerald-50 text-emerald-700" },
  FEEDBACK_SUBMITTED: { icon: MessageSquareHeart, tint: "bg-slate-100 text-slate-600" },
  SIGNED_IN: { icon: LogIn, tint: "bg-slate-100 text-slate-600" },
  PROFILE_UPDATED: { icon: UserCog, tint: "bg-slate-100 text-slate-600" },
};

export const ACTIVITY_FILTERS: { label: string; types: PatientActivityType[] }[] = [
  { label: "All", types: [] },
  { label: "AI", types: ["AI_TRIAGE"] },
  { label: "Bookings", types: ["APPOINTMENT_BOOKED", "PRESCRIPTION_ROUTED"] },
  { label: "Referrals", types: ["REFERRAL_CREATED", "REFERRAL_SHARED", "REFERRAL_SHARE_OPENED", "REFERRAL_SHARE_REVOKED", "INSURANCE_UPDATED"] },
  { label: "Health log", types: ["CYCLE_LOGGED"] },
  { label: "Account", types: ["SIGNED_IN", "CONSENT_GRANTED", "CONSENT_WITHDRAWN", "PROFILE_UPDATED", "FEEDBACK_SUBMITTED"] },
];

const REF_LINKS: Record<string, string> = {
  Referral: "/dashboard/referrals",
  Appointment: "/dashboard/providers",
  Prescription: "/dashboard/prescriptions",
};

function AiDetails({ details }: { details: Record<string, unknown> }) {
  const prompt = (details.prompt ?? {}) as { symptoms?: string[]; notes?: string; cycleDay?: number };
  const response = (details.response ?? {}) as { severity?: string; summary?: string; recommendedSpecialty?: string; redFlags?: string[]; engine?: string };
  return (
    <div className="mt-3 space-y-3 text-sm">
      <div className="rounded-xl bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">You asked</p>
        {prompt.symptoms?.length ? <p className="mt-1 text-slate-800">{prompt.symptoms.join(", ")}</p> : null}
        {prompt.notes ? <p className="mt-1 whitespace-pre-line break-words text-slate-700">“{prompt.notes}”</p> : null}
        {prompt.cycleDay ? <p className="mt-1 text-xs text-slate-500">Cycle day {prompt.cycleDay}</p> : null}
      </div>
      <div className="rounded-xl border border-nc-divider p-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI answered</p>
          {response.severity && <StatusChip tone={SEVERITY_TONE[response.severity] ?? "neutral"}>{response.severity}</StatusChip>}
          {response.engine && <span className="text-xs text-slate-400">via {response.engine === "medgemma" ? "MedGemma" : response.engine === "gemini" ? "Gemini" : "safety rules"}</span>}
        </div>
        {response.summary && <p className="mt-2 leading-relaxed text-slate-700">{response.summary}</p>}
        {response.recommendedSpecialty && <p className="mt-2 text-slate-600">Suggested specialist: <span className="font-medium text-nc-ink">{response.recommendedSpecialty}</span></p>}
        {response.redFlags?.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
            {response.redFlags.map((f) => <li key={f}>{f}</li>)}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

/** Patient activity timeline. `types` fixes the filter (e.g. AI history); otherwise filter chips are shown. */
export function ActivityTimeline({ types, expandAi = false, emptyText }: { types?: PatientActivityType[]; expandAi?: boolean; emptyText?: string }) {
  const [filter, setFilter] = useState(0);
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const activeTypes = types ?? ACTIVITY_FILTERS[filter].types;
  const typeKey = activeTypes.join(",");

  const load = useCallback(async (after: string | null) => {
    const qs = new URLSearchParams();
    if (typeKey) qs.set("types", typeKey);
    if (after) qs.set("cursor", after);
    const res = await fetch(`/api/activity?${qs}`);
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not load your activity.");
    return (await res.json()) as { items: ActivityItem[]; nextCursor: string | null };
  }, [typeKey]);

  useEffect(() => {
    let cancelled = false;
    load(null)
      .then((d) => {
        if (cancelled) return;
        setItems(d.items);
        setCursor(d.nextCursor);
        setError("");
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const d = await load(cursor);
      setItems((prev) => [...(prev ?? []), ...d.items]);
      setCursor(d.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load more.");
    } finally {
      setLoadingMore(false);
    }
  }

  const toggle = (id: string) => setOpen((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });

  // Group by calendar day for a readable timeline.
  const groups: { day: string; items: ActivityItem[] }[] = [];
  for (const it of items ?? []) {
    const day = formatDate(it.createdAt, "long");
    const g = groups[groups.length - 1];
    if (g && g.day === day) g.items.push(it);
    else groups.push({ day, items: [it] });
  }

  return (
    <div className="space-y-5">
      {!types && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter activity">
          {ACTIVITY_FILTERS.map((f, i) => (
            <button key={f.label} type="button" aria-pressed={filter === i} onClick={() => { setItems(null); setFilter(i); }} className="m3-chip">
              {f.label}
            </button>
          ))}
        </div>
      )}

      {error && <Callout tone="danger" role="alert">{error}</Callout>}

      {items === null && !error ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-white" />)}
        </div>
      ) : items && items.length === 0 ? (
        <div className="card-surface p-10 text-center">
          <Activity className="mx-auto h-10 w-10 text-slate-300" aria-hidden />
          <p className="mt-3 text-sm text-slate-600">{emptyText ?? "Nothing here yet. Your actions on NauriCare will appear here."}</p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.day} aria-label={g.day}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{g.day}</h3>
            <ol className="space-y-2">
              {g.items.map((it) => {
                const { icon: Icon, tint } = META[it.type];
                const isAi = it.type === "AI_TRIAGE" && it.details;
                const expanded = expandAi || open.has(it.id);
                const href = it.refType ? REF_LINKS[it.refType] : undefined;
                return (
                  <li key={it.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tint}`}>
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-nc-ink">{it.title}</p>
                        <p className="text-xs text-slate-500">{formatTime(it.createdAt)}{href && <> · <Link href={href} className="font-medium text-nc-primary hover:underline">View</Link></>}</p>
                      </div>
                      {isAi && !expandAi && (
                        <button type="button" onClick={() => toggle(it.id)} aria-expanded={expanded} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={expanded ? "Hide details" : "Show what you asked and the AI's answer"}>
                          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden />
                        </button>
                      )}
                    </div>
                    {isAi && expanded && <AiDetails details={it.details!} />}
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      )}

      {cursor && (
        <div className="text-center">
          <button type="button" onClick={loadMore} disabled={loadingMore} className="m3-btn-outlined">{loadingMore ? "Loading…" : "Load older activity"}</button>
        </div>
      )}
    </div>
  );
}
