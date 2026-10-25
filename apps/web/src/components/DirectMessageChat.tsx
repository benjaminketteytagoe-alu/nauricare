"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { formatRelative } from "@/lib/format";
import { ArrowLeft, Lock, MessageSquare, Plus, Search, Send, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useRealtime } from "@/components/realtime/RealtimeProvider";
import { useClientValue } from "@/lib/hooks/useClientValue";
import { getConversations, getDirectMessages, getMessageableProviders, sendDirectMessage } from "@/actions/directMessage";

type Conversation = {
  partnerId: string;
  partnerName: string;
  partnerAvatarUrl: string | null;
  partnerSubtitle: string | null;
  online: boolean;
  lastMessage: string;
  lastMessageAt: Date | string;
  isRead: boolean;
};

type Contact = { id: string; name: string; avatarUrl: string | null; subtitle: string | null; online: boolean };

type DM = {
  id: string;
  senderId: string;
  content: string;
  createdAt: Date | string;
  sender: { id: string; name: string };
};

const ACCENTS = {
  blue: { ring: "focus:ring-blue-500", bg: "bg-blue-600", hover: "hover:bg-blue-700", time: "text-blue-100", text: "text-blue-600", soft: "bg-blue-50" },
  teal: { ring: "focus:ring-teal-500", bg: "bg-teal-600", hover: "hover:bg-teal-700", time: "text-teal-100", text: "text-teal-600", soft: "bg-teal-50" },
  rose: { ring: "focus:ring-rose-500", bg: "bg-rose-600", hover: "hover:bg-rose-700", time: "text-rose-100", text: "text-rose-600", soft: "bg-rose-50" },
} as const;

function OnlineDot({ online }: { online: boolean }) {
  return online ? <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" aria-label="Online" /> : null;
}

/**
 * Shared patient/provider messaging. Live via the realtime stream; on small
 * screens it shows either the conversation list or the open thread.
 */
export function DirectMessageChat({
  currentUserId,
  accentColor = "teal",
  canStartWithProviders = false,
}: {
  currentUserId: string;
  accentColor?: keyof typeof ACCENTS;
  canStartWithProviders?: boolean;
}) {
  const acc = ACCENTS[accentColor];
  const deepLink = useClientValue(() => new URLSearchParams(window.location.search).get("with"), null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chosen, setChosen] = useState<{ id: string; name: string; avatar: string | null; subtitle: string | null } | null>(null);
  const [messages, setMessages] = useState<DM[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [gateError, setGateError] = useState("");
  const [picker, setPicker] = useState<Contact[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  const refreshConversations = useCallback(() => {
    return getConversations()
      .then((res) => {
        if (res.success) setConversations(res.data as Conversation[]);
      })
      .catch(() => {})
      .finally(() => setLoadingConvs(false));
  }, []);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  // ?with=<provider> for a brand-new conversation: look the provider up.
  useEffect(() => {
    if (!deepLink || chosen || !canStartWithProviders || loadingConvs) return;
    if (conversations.some((c) => c.partnerId === deepLink)) return;
    let cancelled = false;
    getMessageableProviders().then((res) => {
      const p = res.success ? res.data.find((x) => x.id === deepLink) : undefined;
      if (p && !cancelled) open(p.id, p.name, p.avatarUrl, p.subtitle);
    });
    return () => {
      cancelled = true;
    };
  }, [deepLink, chosen, canStartWithProviders, loadingConvs, conversations]);

  // Open the conversation named in ?with= (e.g. from a notification).
  const active = chosen ?? (deepLink ? (() => {
    const c = conversations.find((x) => x.partnerId === deepLink);
    return c ? { id: c.partnerId, name: c.partnerName, avatar: c.partnerAvatarUrl, subtitle: c.partnerSubtitle } : null;
  })() : null);
  const activeId = active?.id ?? null;

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    getDirectMessages(activeId)
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setMessages(res.data as DM[]);
          setConversations((prev) => prev.map((c) => (c.partnerId === activeId ? { ...c, isRead: true } : c)));
        } else setGateError(res.error ?? "Cannot load this conversation.");
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoadingThread(false));
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // Live incoming (and own other-tab) messages.
  useRealtime("message", (m) => {
    const partnerId = m.senderId === currentUserId ? m.receiverId : m.senderId;
    if (partnerId === activeId) {
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      if (m.senderId !== currentUserId) void getDirectMessages(partnerId); // marks it read
    }
    setConversations((prev) => {
      const existing = prev.find((c) => c.partnerId === partnerId);
      if (!existing) {
        void refreshConversations();
        return prev;
      }
      const updated = { ...existing, lastMessage: m.content, lastMessageAt: m.createdAt, isRead: partnerId === activeId || m.senderId === currentUserId };
      return [updated, ...prev.filter((c) => c.partnerId !== partnerId)];
    });
  });

  function open(id: string, name: string, avatar: string | null, subtitle: string | null) {
    setChosen({ id, name, avatar, subtitle });
    setMessages([]);
    setDraft("");
    setLoadingThread(true);
    setGateError("");
    setPicker(null);
  }

  async function openPicker() {
    const res = await getMessageableProviders();
    setPicker(res.success ? res.data : []);
  }

  function handleSend() {
    const trimmed = draft.trim();
    if (!active || !trimmed || isPending) return;
    setDraft("");
    const optimistic: DM = { id: `opt-${Date.now()}`, senderId: currentUserId, content: trimmed, createdAt: new Date(), sender: { id: currentUserId, name: "You" } };
    setMessages((prev) => [...prev, optimistic]);

    startTransition(async () => {
      const res = await sendDirectMessage(active.id, trimmed);
      if (res.success) {
        const saved = res.data as DM;
        setMessages((prev) => (prev.some((m) => m.id === saved.id) ? prev.filter((m) => m.id !== optimistic.id) : prev.map((m) => (m.id === optimistic.id ? saved : m))));
        setConversations((prev) => {
          const rest = prev.filter((c) => c.partnerId !== active.id);
          const existing = prev.find((c) => c.partnerId === active.id);
          return [{ partnerId: active.id, partnerName: active.name, partnerAvatarUrl: active.avatar, partnerSubtitle: active.subtitle, online: existing?.online ?? false, lastMessage: trimmed, lastMessageAt: new Date(), isRead: true }, ...rest];
        });
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setGateError(res.error ?? "Failed to send.");
      }
    });
  }

  const filtered = useMemo(() => conversations.filter((c) => c.partnerName.toLowerCase().includes(search.toLowerCase())), [conversations, search]);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* Conversation list (hidden on small screens while a thread is open) */}
      <aside className={`${active ? "hidden md:flex" : "flex"} w-full flex-col border-r border-gray-100 md:w-80 md:shrink-0`}>
        <div className="space-y-3 border-b border-gray-100 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations" aria-label="Search conversations" className={`w-full rounded-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 ${acc.ring}`} />
          </div>
          {canStartWithProviders && (
            <button type="button" onClick={openPicker} className={`flex w-full items-center justify-center gap-2 rounded-full ${acc.bg} ${acc.hover} px-4 py-2 text-sm font-semibold text-white`}>
              <Plus className="h-4 w-4" aria-hidden /> Message a specialist
            </button>
          )}
        </div>

        {picker ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Verified specialists
              <button type="button" onClick={() => setPicker(null)} aria-label="Close specialist list" className="rounded-full p-1 hover:bg-gray-100"><X className="h-4 w-4" aria-hidden /></button>
            </div>
            <ul className="flex-1 overflow-y-auto">
              {picker.length === 0 && <li className="p-6 text-center text-sm text-gray-500">No specialists are available right now.</li>}
              {picker.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => open(p.id, p.name, p.avatarUrl, p.subtitle)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50">
                    <span className="relative"><Avatar name={p.name} avatarUrl={p.avatarUrl} size="md" /><OnlineDot online={p.online} /></span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-gray-900">{p.name}</span>
                      <span className="block truncate text-xs text-gray-500">{p.online ? "Online now" : p.subtitle}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto" aria-label="Conversations">
            {loadingConvs && <li className="p-6 text-center text-sm text-gray-400">Loading…</li>}
            {!loadingConvs && filtered.length === 0 && (
              <li className="p-6 text-center text-sm text-gray-500">
                <MessageSquare className="mx-auto mb-2 h-8 w-8 text-gray-300" aria-hidden />
                No conversations yet.
              </li>
            )}
            {filtered.map((c) => (
              <li key={c.partnerId}>
                <button type="button" onClick={() => open(c.partnerId, c.partnerName, c.partnerAvatarUrl, c.partnerSubtitle)} aria-current={activeId === c.partnerId} className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${activeId === c.partnerId ? acc.soft : ""}`}>
                  <span className="relative shrink-0"><Avatar name={c.partnerName} avatarUrl={c.partnerAvatarUrl} size="md" /><OnlineDot online={c.online} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${c.isRead ? "font-medium text-gray-800" : "font-bold text-gray-900"}`}>{c.partnerName}</span>
                      <span className="shrink-0 text-xs text-gray-400">{formatRelative(c.lastMessageAt)}</span>
                    </span>
                    <span className={`block truncate text-xs ${c.isRead ? "text-gray-500" : `font-semibold ${acc.text}`}`}>{c.lastMessage}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Thread */}
      <section className={`${active ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
        {!active ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-gray-400">
            <MessageSquare className="mb-3 h-12 w-12 text-gray-200" aria-hidden />
            <p className="text-sm">Select a conversation{canStartWithProviders ? " or message a specialist" : ""}.</p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
              <button type="button" onClick={() => setChosen(null)} className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 md:hidden" aria-label="Back to conversations"><ArrowLeft className="h-5 w-5" aria-hidden /></button>
              <Avatar name={active.name} avatarUrl={active.avatar} size="md" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900">{active.name}</p>
                {active.subtitle && <p className="truncate text-xs text-gray-500">{active.subtitle}</p>}
              </div>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50/60 p-4" aria-live="polite">
              {loadingThread && <p className="text-center text-sm text-gray-400">Loading…</p>}
              {gateError && <p className="mx-auto max-w-sm rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-800">{gateError}</p>}
              {!loadingThread && !gateError && messages.length === 0 && (
                <p className="mx-auto max-w-sm text-center text-sm text-gray-500">Say hello. Please don&apos;t share emergencies here: call 112 / 912.</p>
              )}
              {messages.map((m) => {
                const mine = m.senderId === currentUserId;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm sm:max-w-[70%] ${mine ? `${acc.bg} rounded-br-sm text-white` : "rounded-bl-sm border border-gray-100 bg-white text-gray-800"}`}>
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      <p className={`mt-1 text-[10px] ${mine ? acc.time : "text-gray-400"}`}>{formatRelative(m.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <footer className="border-t border-gray-100 p-3">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-end gap-2">
                <label htmlFor="dm-draft" className="sr-only">Message</label>
                <textarea
                  id="dm-draft"
                  rows={1}
                  value={draft}
                  maxLength={4000}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Write a message…"
                  className={`max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${acc.ring}`}
                />
                <button type="submit" disabled={!draft.trim() || isPending} aria-label="Send message" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${acc.bg} ${acc.hover} text-white disabled:opacity-50`}>
                  <Send className="h-4 w-4" aria-hidden />
                </button>
              </form>
              <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-gray-400"><Lock className="h-3 w-3" aria-hidden /> Private between you and {active.name}</p>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
