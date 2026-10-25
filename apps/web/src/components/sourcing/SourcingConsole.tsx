"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check, ExternalLink, Globe, Loader2, Mail, MapPin, Pencil, Phone, Play, Plus, Power, Quote, UserRound, X,
} from "lucide-react";
import type { ProviderCandidateStatus, ProviderScrapeStatus } from "@prisma/client";
import { Callout } from "@/components/ui/callout";
import { StatusChip, type ChipTone } from "@/components/ui/status-chip";
import { formatDateTime } from "@/lib/format";

interface Run {
  id: string;
  status: ProviderScrapeStatus;
  pagesFetched: number;
  candidatesFound: number;
  log: string | null;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
}
interface Source {
  id: string;
  name: string;
  url: string;
  notes: string | null;
  isActive: boolean;
  lastRunAt: string | null;
  runs: Run[];
  _count: { candidates: number };
}
interface Candidate {
  id: string;
  fullName: string;
  specialty: string;
  email: string | null;
  phone: string | null;
  yearsExperience: number | null;
  facilityName: string | null;
  practiceLocation: string | null;
  profileUrl: string;
  evidence: string;
  confidence: number;
  extractor: string;
  status: ProviderCandidateStatus;
  reviewNote: string | null;
  invitedAt: string | null;
  inviteExpiresAt: string | null;
  consentSource: string | null;
  hasPhoto: boolean;
  createdAt: string;
  source: { name: string; url: string };
}

const RUN_TONE: Record<ProviderScrapeStatus, ChipTone> = { QUEUED: "neutral", RUNNING: "amber", SUCCEEDED: "success", FAILED: "berry" };
const STATUS_TABS: { status: ProviderCandidateStatus; label: string }[] = [
  { status: "PENDING_REVIEW", label: "To review" },
  { status: "INVITED", label: "Invited" },
  { status: "PUBLISHED", label: "Published" },
  { status: "REJECTED", label: "Rejected" },
  { status: "DUPLICATE", label: "Duplicates" },
];

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed.");
  return data as T;
}

// ── Sources ──────────────────────────────────────────────────────────────────

function SourcesPanel({ onRunFinished }: { onRunFinished: () => void }) {
  const [sources, setSources] = useState<Source[] | null>(null);
  const [form, setForm] = useState({ name: "", url: "", notes: "" });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [openLog, setOpenLog] = useState<string | null>(null);
  const wasRunning = useRef(false);

  const load = useCallback(async () => {
    const d = await api<{ sources: Source[] }>("/api/admin/sourcing/sources");
    setSources(d.sources);
    const running = d.sources.some((s) => s.runs[0] && (s.runs[0].status === "RUNNING" || s.runs[0].status === "QUEUED"));
    if (wasRunning.current && !running) onRunFinished();
    wasRunning.current = running;
    return running;
  }, [onRunFinished]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const tick = async () => {
      try {
        const running = await load();
        if (!stopped) timer = setTimeout(tick, running ? 3000 : 20000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load sources.");
      }
    };
    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError("");
    try {
      await api("/api/admin/sourcing/sources", { method: "POST", body: JSON.stringify(form) });
      setForm({ name: "", url: "", notes: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the source.");
    } finally {
      setAdding(false);
    }
  }

  async function run(id: string) {
    setError("");
    try {
      await api(`/api/admin/sourcing/sources/${id}/run`, { method: "POST" });
      setOpenLog(id);
      wasRunning.current = true;
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the crawl.");
    }
  }

  async function toggle(s: Source) {
    try {
      await api(`/api/admin/sourcing/sources/${s.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !s.isActive }) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the source.");
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">Sources</h2>
      <p className="mt-1 text-sm text-slate-600">Hospital or clinic pages that list doctors. The crawler stays on that site, respects robots.txt and waits between requests.</p>

      <form onSubmit={add} className="mt-4 grid gap-3 md:grid-cols-[1fr_1.4fr_auto]">
        <input required minLength={2} maxLength={120} placeholder="Name, e.g. King Faisal Hospital doctors" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="m3-input" aria-label="Source name" />
        <input required type="url" placeholder="https://hospital.rw/our-doctors" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="m3-input" aria-label="Source URL" />
        <button type="submit" disabled={adding} className="m3-btn-filled">{adding ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />} Add source</button>
      </form>
      {error && <Callout tone="danger" role="alert" className="mt-4">{error}</Callout>}

      <ul className="mt-5 divide-y divide-gray-100">
        {sources === null && <li className="py-6 text-center text-sm text-slate-500">Loading…</li>}
        {sources?.length === 0 && <li className="py-6 text-center text-sm text-slate-500">No sources yet. Add a hospital&apos;s doctors page above.</li>}
        {sources?.map((s) => {
          const last = s.runs[0];
          const running = last && (last.status === "RUNNING" || last.status === "QUEUED");
          return (
            <li key={s.id} className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`font-semibold ${s.isActive ? "text-slate-900" : "text-slate-400"}`}>{s.name}</p>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 truncate text-sm text-teal-700 hover:underline"><Globe className="h-3.5 w-3.5 shrink-0" aria-hidden />{s.url}</a>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {last ? <StatusChip tone={RUN_TONE[last.status]}>{last.status.toLowerCase()}</StatusChip> : <span>Never crawled</span>}
                    {last && <span>{last.pagesFetched} pages · {last.candidatesFound} candidates · {formatDateTime(last.createdAt)}</span>}
                    <span>{s._count.candidates} total candidates</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => toggle(s)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" title={s.isActive ? "Disable source" : "Enable source"} aria-label={s.isActive ? "Disable source" : "Enable source"}><Power className="h-4 w-4" aria-hidden /></button>
                  {last?.log && <button type="button" onClick={() => setOpenLog(openLog === s.id ? null : s.id)} className="text-sm font-medium text-slate-600 hover:underline">{openLog === s.id ? "Hide log" : "Log"}</button>}
                  <button type="button" onClick={() => run(s.id)} disabled={!s.isActive || !!running} className="inline-flex items-center gap-1.5 rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50">
                    {running ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />} {running ? "Crawling…" : "Crawl now"}
                  </button>
                </div>
              </div>
              {openLog === s.id && last?.log && (
                <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">{last.log}{last.error ? `\n\nERROR: ${last.error}` : ""}</pre>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ── Candidates ───────────────────────────────────────────────────────────────

function CandidateCard({ c, onChanged }: { c: Candidate; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ fullName: c.fullName, specialty: c.specialty, email: c.email ?? "", phone: c.phone ?? "", yearsExperience: c.yearsExperience?.toString() ?? "", facilityName: c.facilityName ?? "", practiceLocation: c.practiceLocation ?? "" });
  const [mode, setMode] = useState<null | "publish" | "reject">(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "danger" | "warning" | "success"; text: string } | null>(null);
  const pending = c.status === "PENDING_REVIEW";

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await api(`/api/admin/sourcing/candidates/${c.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...draft, email: draft.email || null, phone: draft.phone || null, facilityName: draft.facilityName || null, practiceLocation: draft.practiceLocation || null, yearsExperience: draft.yearsExperience ? Number(draft.yearsExperience) : null }),
      });
      setEditing(false);
      onChanged();
    } catch (e) {
      setMsg({ tone: "danger", text: e instanceof Error ? e.message : "Could not save." });
    } finally {
      setBusy(false);
    }
  }

  async function review(action: "invite" | "publish" | "reject" | "duplicate") {
    setBusy(true);
    setMsg(null);
    try {
      const d = await api<{ emailSent: boolean | null }>(`/api/admin/sourcing/candidates/${c.id}/review`, { method: "POST", body: JSON.stringify({ action, note: note || undefined }) });
      if (d.emailSent === false) setMsg({ tone: "warning", text: "Saved, but the invitation email could not be sent. Check the email settings, then contact the doctor directly." });
      onChanged();
    } catch (e) {
      setMsg({ tone: "danger", text: e instanceof Error ? e.message : "Could not save the decision." });
    } finally {
      setBusy(false);
    }
  }

  const field = (key: keyof typeof draft, label: string, type = "text") => (
    <label className="text-xs">
      <span className="mb-1 block font-medium text-slate-500">{label}</span>
      <input type={type} value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} className="m3-input py-2" />
    </label>
  );

  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-slate-100">
          {c.hasPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin-only same-origin proxy, not optimisable
            <img src={`/api/admin/sourcing/candidates/${c.id}/photo`} alt={`Photo of ${c.fullName}`} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <UserRound className="m-4 h-8 w-8 text-slate-300" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {field("fullName", "Full name")}
              {field("specialty", "Specialty")}
              {field("email", "Email", "email")}
              {field("phone", "Phone")}
              {field("yearsExperience", "Years of experience", "number")}
              {field("facilityName", "Practice / facility")}
              <div className="sm:col-span-2">{field("practiceLocation", "Location")}</div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold text-slate-900">{c.fullName}</p>
                <StatusChip tone={c.confidence >= 0.75 ? "success" : c.confidence >= 0.5 ? "amber" : "neutral"}>{Math.round(c.confidence * 100)}% · {c.extractor}</StatusChip>
              </div>
              <p className="text-sm text-slate-700">{c.specialty}{c.yearsExperience != null && ` · ${c.yearsExperience} years`}</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" aria-hidden />{c.email ?? <span className="text-nc-berry">No email found (needed to invite)</span>}</li>
                {c.phone && <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" aria-hidden />{c.phone}</li>}
                {(c.facilityName || c.practiceLocation) && <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" aria-hidden />{[c.facilityName, c.practiceLocation].filter(Boolean).join(" · ")}</li>}
              </ul>
            </>
          )}
          <blockquote className="mt-3 flex gap-2 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            <span className="line-clamp-4">{c.evidence}</span>
          </blockquote>
          <a href={c.profileUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline">
            {c.source.name} <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
          {c.reviewNote && <p className="mt-2 text-xs text-slate-500">Note: {c.reviewNote}</p>}
          {c.status === "INVITED" && c.inviteExpiresAt && <p className="mt-2 text-xs text-slate-500">Invited {formatDateTime(c.invitedAt!)}, link valid until {formatDateTime(c.inviteExpiresAt)}.</p>}
          {c.status === "PUBLISHED" && <p className="mt-2 text-xs text-emerald-700">Live provider · consent: {c.consentSource === "INVITE_CLAIMED" ? "accepted invitation" : "admin-recorded"}</p>}
        </div>
      </div>

      {msg && <Callout tone={msg.tone} role="alert" className="mt-4">{msg.text}</Callout>}

      {pending && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          {editing ? (
            <div className="flex gap-2">
              <button type="button" onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Check className="h-4 w-4" aria-hidden /> Save</button>
              <button type="button" onClick={() => setEditing(false)} className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
            </div>
          ) : mode ? (
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1.5 block font-semibold text-slate-800">{mode === "publish" ? "How did the doctor consent? (who, when, how)" : "Reason (optional)"}</span>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} className="m3-input" placeholder={mode === "publish" ? "e.g. Phoned Dr X on 24 Oct; she agreed to be listed." : ""} />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => review(mode)} disabled={busy} className={`rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${mode === "publish" ? "bg-teal-700" : "bg-nc-berry"}`}>
                  {mode === "publish" ? "Publish now and send account setup" : "Reject"}
                </button>
                <button type="button" onClick={() => setMode(null)} className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => review("invite")} disabled={busy || !c.email} className="inline-flex items-center gap-1.5 rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50" title={c.email ? "" : "Add an email first"}>
                <Mail className="h-4 w-4" aria-hidden /> Approve &amp; invite
              </button>
              <button type="button" onClick={() => setMode("publish")} disabled={busy || !c.email} className="rounded-full border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-50">Publish with recorded consent</button>
              <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"><Pencil className="h-4 w-4" aria-hidden /> Edit</button>
              <button type="button" onClick={() => review("duplicate")} disabled={busy} className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Duplicate</button>
              <button type="button" onClick={() => setMode("reject")} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-nc-berry hover:bg-rose-50"><X className="h-4 w-4" aria-hidden /> Reject</button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function CandidatesPanel({ refreshKey }: { refreshKey: number }) {
  const [status, setStatus] = useState<ProviderCandidateStatus>("PENDING_REVIEW");
  const [items, setItems] = useState<Candidate[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api<{ candidates: Candidate[]; nextCursor: string | null }>(`/api/admin/sourcing/candidates?status=${status}`)
      .then((d) => {
        if (cancelled) return;
        setItems(d.candidates);
        setCursor(d.nextCursor);
        setError("");
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [status, refreshKey, version]);

  async function more() {
    if (!cursor) return;
    const d = await api<{ candidates: Candidate[]; nextCursor: string | null }>(`/api/admin/sourcing/candidates?status=${status}&cursor=${cursor}`);
    setItems((p) => [...(p ?? []), ...d.candidates]);
    setCursor(d.nextCursor);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Candidates</h2>
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Candidate status">
          {STATUS_TABS.map((t) => (
            <button key={t.status} role="tab" aria-selected={status === t.status} onClick={() => { setItems(null); setStatus(t.status); }} className={`rounded-full px-3 py-1.5 text-sm font-medium ${status === t.status ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {error && <Callout tone="danger" role="alert">{error}</Callout>}
      {items === null ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-slate-500">Nothing here.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((c) => <CandidateCard key={c.id} c={c} onChanged={() => setVersion((v) => v + 1)} />)}
        </ul>
      )}
      {cursor && <div className="text-center"><button type="button" onClick={more} className="m3-btn-outlined">Load more</button></div>}
    </section>
  );
}

export function SourcingConsole() {
  const [refreshKey, setRefreshKey] = useState(0);
  const onRunFinished = useCallback(() => setRefreshKey((k) => k + 1), []);
  return (
    <div className="space-y-8">
      <SourcesPanel onRunFinished={onRunFinished} />
      <CandidatesPanel refreshKey={refreshKey} />
    </div>
  );
}
