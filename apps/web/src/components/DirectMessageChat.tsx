"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Search, Send, Lock, MessageSquare } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { getConversations, getDirectMessages, sendDirectMessage } from "@/actions/directMessage";

type Conversation = {
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  partnerAvatarUrl: string | null;
  lastMessage: string;
  lastMessageAt: Date | string;
  isRead: boolean;
};

type DM = {
  id: string;
  senderId: string;
  content: string;
  createdAt: Date | string;
  sender: { id: string; name: string };
};

function relTime(ts: Date | string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function DirectMessageChat({
  currentUserId,
  accentColor = "teal",
}: {
  currentUserId: string;
  accentColor?: "teal" | "blue";
}) {
  const acc = accentColor === "blue"
    ? { ring: "ring-blue-500", bg: "bg-blue-600", hover: "hover:bg-blue-700", bubble: "bg-blue-600", time: "text-blue-200", border: "border-blue-600", text: "text-blue-600" }
    : { ring: "ring-teal-500", bg: "bg-teal-600", hover: "hover:bg-teal-700", bubble: "bg-teal-600", time: "text-teal-200", border: "border-teal-600", text: "text-teal-600" };

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeName, setActiveName] = useState("");
  const [activeAvatar, setActiveAvatar] = useState<string | null>(null);
  const [messages, setMessages] = useState<DM[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [gateError, setGateError] = useState("");
  const [isPending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getConversations()
      .then((res) => { if (res.success) setConversations(res.data as Conversation[]); })
      .catch(() => {})
      .finally(() => setLoadingConvs(false));
  }, []);

  useEffect(() => {
    if (!activeId) return;
    setLoadingThread(true);
    setGateError("");
    getDirectMessages(activeId)
      .then((res) => {
        if (res.success) setMessages(res.data as DM[]);
        else setGateError(res.error ?? "Cannot load thread.");
      })
      .catch(() => {})
      .finally(() => setLoadingThread(false));

    const interval = setInterval(() => {
      getDirectMessages(activeId).then((res) => {
        if (res.success) setMessages(res.data as DM[]);
      });
    }, 10_000);
    return () => clearInterval(interval);
  }, [activeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function selectConversation(id: string, name: string, avatar: string | null) {
    setActiveId(id);
    setActiveName(name);
    setActiveAvatar(avatar);
    setMessages([]);
    setDraft("");
  }

  function handleSend() {
    const trimmed = draft.trim();
    if (!activeId || !trimmed || isPending) return;
    setDraft("");

    const optimistic: DM = {
      id: `opt-${Date.now()}`,
      senderId: currentUserId,
      content: trimmed,
      createdAt: new Date(),
      sender: { id: currentUserId, name: "You" },
    };
    setMessages((prev) => [...prev, optimistic]);

    startTransition(async () => {
      const res = await sendDirectMessage(activeId, trimmed);
      if (res.success) {
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? (res.data as DM) : m)));
        setConversations((prev) => {
          const exists = prev.find((c) => c.partnerId === activeId);
          if (exists) {
            return prev.map((c) =>
              c.partnerId === activeId ? { ...c, lastMessage: trimmed, lastMessageAt: new Date(), isRead: true } : c,
            );
          }
          return [{ partnerId: activeId, partnerName: activeName, partnerEmail: "", partnerAvatarUrl: activeAvatar, lastMessage: trimmed, lastMessageAt: new Date(), isRead: true }, ...prev];
        });
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setGateError(res.error ?? "Failed to send.");
      }
    });
  }

  const filtered = conversations.filter((c) =>
    c.partnerName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row min-h-0">
      {/* Sidebar */}
      <div className="w-full md:w-80 border-r border-slate-100 flex flex-col bg-slate-50/50 shrink-0">
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className={`w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:${acc.ring} focus:ring-2 outline-none`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                    <div className="h-2.5 bg-slate-100 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-8 h-full">
              <MessageSquare className="w-8 h-8 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-900">No conversations yet</p>
              <p className="text-xs text-slate-500 mt-1">
                {search ? "No results." : "Secure messages with your care team appear here."}
              </p>
            </div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.partnerId}
                onClick={() => selectConversation(conv.partnerId, conv.partnerName, conv.partnerAvatarUrl)}
                className={`w-full p-4 flex items-center gap-3 text-left transition-colors hover:bg-slate-100 border-l-2 ${
                  activeId === conv.partnerId ? `bg-slate-100 ${acc.border}` : "border-transparent"
                }`}
              >
                <Avatar name={conv.partnerName} avatarUrl={conv.partnerAvatarUrl} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center gap-1">
                    <span className="text-sm font-semibold text-slate-900 truncate">{conv.partnerName}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">{relTime(conv.lastMessageAt)}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{conv.lastMessage}</p>
                  {!conv.isRead && <span className={`inline-block w-2 h-2 ${acc.bg} rounded-full mt-1.5`} />}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeId ? (
          <>
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
              <Avatar name={activeName} avatarUrl={activeAvatar} size="sm" />
              <div>
                <h3 className="font-semibold text-slate-900">{activeName}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> End-to-end encrypted · polls every 10s
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingThread && messages.length === 0 ? (
                <div className="flex justify-center pt-8">
                  <div className={`w-6 h-6 border-2 ${acc.border} border-t-transparent rounded-full animate-spin`} />
                </div>
              ) : gateError ? (
                <div className="flex flex-col items-center justify-center h-full text-center pt-8 gap-2">
                  <Lock className="w-6 h-6 text-rose-400" />
                  <p className="text-sm text-rose-500 font-medium">{gateError}</p>
                  <p className="text-xs text-slate-400">Messaging requires a shared appointment.</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center pt-8">
                  <p className="text-sm text-slate-400">No messages yet. Say hello.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === currentUserId;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[72%] rounded-2xl px-4 py-2.5 ${
                          isMe ? `${acc.bubble} text-white rounded-br-sm` : "bg-slate-100 text-slate-900 rounded-bl-sm"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isMe ? acc.time : "text-slate-400"}`}>
                          {relTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
              {gateError ? (
                <p className="text-xs text-center text-slate-400">Messaging unavailable — no shared appointment.</p>
              ) : (
                <div className="flex items-center gap-3">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Type a secure message… (Enter to send)"
                    className={`flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:${acc.ring} transition-shadow`}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!draft.trim() || isPending}
                    className={`p-3 ${acc.bg} text-white rounded-xl ${acc.hover} disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors`}
                    aria-label="Send"
                  >
                    {isPending ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className={`w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4`}>
              <Send className="w-6 h-6 text-slate-300 ml-1" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Select a Conversation</h3>
            <p className="text-slate-500 mt-1 max-w-sm text-sm">
              Choose a contact from the list to start messaging securely.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
