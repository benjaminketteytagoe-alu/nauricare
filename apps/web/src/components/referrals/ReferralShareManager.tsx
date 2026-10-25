"use client";

import { useCallback, useState } from "react";
import { Check, ChevronDown, ClipboardCopy, Link2, Loader2, ShieldCheck } from "lucide-react";
import { Callout } from "@/components/ui/callout";
import { StatusChip, type ChipTone } from "@/components/ui/status-chip";
import { formatDate, formatDateTime } from "@/lib/format";

interface Share {
  id: string;
  createdAt: string;
  expiresAt: string;
  accessCount: number;
  lastAccessedAt: string | null;
  failedAttempts: number;
  state: "active" | "revoked" | "expired";
}

const STATE_TONE: Record<Share["state"], ChipTone> = { active: "primary", revoked: "muted", expired: "neutral" };

/** Create, list and revoke hospital links for one referral. */
export function ReferralShareManager({ referralId, referralCode, hospitalName }: { referralId: string; referralCode: string; hospitalName: string }) {
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState<Share[] | null>(null);
  const [days, setDays] = useState(14);
  const [created, setCreated] = useState<{ url: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/referrals/${referralId}/shares`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Could not load your links.");
    setShares(data.shares);
  }, [referralId]);

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    // Load the links the first time the panel opens.
    if (next && shares === null) refresh().catch((e: Error) => setError(e.message));
  }

  async function create() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/referrals/${referralId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not create the link.");
      setCreated({ url: data.url, expiresAt: data.expiresAt });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the link.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/referrals/shares/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not revoke the link.");
      setConfirmRevoke(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not revoke the link.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the link stays visible to copy by hand */
    }
  }

  return (
    <div className="mt-4 border-t border-nc-divider pt-4">
      <button type="button" onClick={toggleOpen} aria-expanded={open} className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold text-nc-primary">
        <span className="flex items-center gap-2"><Link2 className="h-4 w-4" aria-hidden /> Share with {hospitalName}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <Callout tone="info" icon={ShieldCheck}>
            The hospital gets a secure link to your referral, details, contact information and insurance, so they can book
            you in. They must also enter your code <strong className="font-mono">{referralCode}</strong>, so give it to them
            separately (for example by phone). You can revoke the link at any time.
          </Callout>

          {error && <Callout tone="danger" role="alert">{error}</Callout>}

          {created ? (
            <div className="rounded-xl border border-nc-primary/30 bg-nc-primary-container p-4">
              <p className="text-sm font-semibold text-nc-ink">Your link is ready</p>
              <p className="mt-1 text-xs text-slate-600">Copy it now: for your privacy we can&apos;t show it again. It expires on {formatDate(created.expiresAt, "long")}.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input readOnly value={created.url} className="m3-input font-mono text-xs" onFocus={(e) => e.currentTarget.select()} aria-label="Referral link" />
                <button type="button" onClick={copy} className="m3-btn-filled shrink-0">
                  {copied ? <Check className="h-4 w-4" aria-hidden /> : <ClipboardCopy className="h-4 w-4" aria-hidden />}
                  {copied ? "Copied" : "Copy link"}
                </button>
              </div>
              <button type="button" onClick={() => setCreated(null)} className="mt-3 text-xs font-medium text-nc-primary hover:underline">Done</button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex-1 text-sm">
                <span className="mb-1.5 block font-semibold text-nc-ink">Link expires after</span>
                <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="m3-input">
                  {[1, 3, 7, 14, 30].map((d) => <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>)}
                </select>
              </label>
              <button type="button" onClick={create} disabled={busy} className="m3-btn-filled">
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Create secure link
              </button>
            </div>
          )}

          {shares && shares.length > 0 && (
            <ul className="space-y-2">
              {shares.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusChip tone={STATE_TONE[s.state]}>{s.state}</StatusChip>
                      <span className="text-slate-600">Created {formatDate(s.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {s.accessCount > 0 ? `Opened ${s.accessCount} time${s.accessCount > 1 ? "s" : ""}, last ${formatDateTime(s.lastAccessedAt!)}` : "Not opened yet"}
                      {s.failedAttempts > 0 && ` · ${s.failedAttempts} wrong code${s.failedAttempts > 1 ? "s" : ""}`}
                      {s.state === "active" && ` · expires ${formatDate(s.expiresAt)}`}
                    </p>
                  </div>
                  {s.state === "active" &&
                    (confirmRevoke === s.id ? (
                      <span className="flex items-center gap-2">
                        <button type="button" onClick={() => revoke(s.id)} disabled={busy} className="rounded-full bg-nc-berry px-3 py-1 text-xs font-semibold text-white">Revoke</button>
                        <button type="button" onClick={() => setConfirmRevoke(null)} className="text-xs font-medium text-slate-600">Cancel</button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setConfirmRevoke(s.id)} className="text-xs font-semibold text-nc-berry hover:underline">Revoke</button>
                    ))}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
