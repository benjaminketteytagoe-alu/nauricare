"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { MessageSquare, Search, Send, Lock } from "lucide-react";

type Conversation = {
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  lastMessage: string;
  lastMessageAt: string;
  isRead: boolean;
};

type Message = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string };
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
      {initials}
    </div>
  );
}

export default function ProviderMessagesPage() {
  const { data: session } = useSession();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeName, setActiveName] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversation list once on mount.
  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/messages");
      if (res.ok) setConversations(await res.json());
      setIsLoadingConversations(false);
    };
    load();
  }, []);

  // Load thread and start polling whenever the active conversation changes.
  useEffect(() => {
    if (!activeId) return;

    const loadThread = async () => {
      setIsLoadingThread(true);
      const res = await fetch(`/api/messages/${activeId}`);
      if (res.ok) setMessages(await res.json());
      setIsLoadingThread(false);
    };

    setMessages([]);
    loadThread();

    const interval = setInterval(loadThread, 10_000);
    return () => clearInterval(interval);
  }, [activeId]);

  // Scroll to the bottom whenever the message list updates.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectConversation = (partnerId: string, partnerName: string) => {
    setActiveId(partnerId);
    setActiveName(partnerName);
  };

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!activeId || !trimmed || isSending) return;

    setIsSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: activeId, content: trimmed }),
      });

      if (res.ok) {
        setDraft("");
        // Refresh the thread immediately — don't wait for the next poll tick.
        const [threadRes, convsRes] = await Promise.all([
          fetch(`/api/messages/${activeId}`),
          fetch("/api/messages"),
        ]);
        if (threadRes.ok) setMessages(await threadRes.json());
        if (convsRes.ok) setConversations(await convsRes.json());
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.partnerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-blue-600" />
          Secure Messages
        </h1>
        <p className="text-slate-500 mt-1 flex items-center gap-2">
          <Lock className="w-4 h-4" /> End-to-end encrypted patient communication.
        </p>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row min-h-0">

        {/* ─── Left Sidebar: Conversation List ─── */}
        <div className="w-full md:w-80 border-r border-slate-100 flex flex-col bg-slate-50/50 shrink-0">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoadingConversations ? (
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
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-8 h-full">
                <MessageSquare className="w-8 h-8 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-900">No active conversations</p>
                <p className="text-xs text-slate-500 mt-1">
                  {searchQuery
                    ? "No results for your search."
                    : "Conversations with your patients will appear here."}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.partnerId}
                  onClick={() => handleSelectConversation(conv.partnerId, conv.partnerName)}
                  className={`w-full p-4 flex items-center gap-3 text-left transition-colors hover:bg-slate-100 border-l-2 ${
                    activeId === conv.partnerId
                      ? "bg-slate-100 border-blue-600"
                      : "border-transparent"
                  }`}
                >
                  <Avatar name={conv.partnerName} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-1">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {conv.partnerName}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {relativeTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{conv.lastMessage}</p>
                    {!conv.isRead && (
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ─── Right Side: Active Chat Window ─── */}
        <div className="flex-1 flex flex-col min-h-0">
          {activeId ? (
            <>
              {/* Chat header */}
              <div className="p-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
                <Avatar name={activeName} />
                <div>
                  <h3 className="font-semibold text-slate-900">{activeName}</h3>
                  <p className="text-xs text-slate-500">Patient · Polling every 10s</p>
                </div>
              </div>

              {/* Message thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoadingThread && messages.length === 0 ? (
                  <div className="flex justify-center pt-8">
                    <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center pt-8">
                    <p className="text-sm text-slate-400">No messages yet. Say hello.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === session?.user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[72%] rounded-2xl px-4 py-2.5 ${
                            isMe
                              ? "bg-blue-600 text-white rounded-br-sm"
                              : "bg-slate-100 text-slate-900 rounded-bl-sm"
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                          <p
                            className={`text-[10px] mt-1 ${
                              isMe ? "text-blue-200" : "text-slate-400"
                            }`}
                          >
                            {relativeTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a secure message… (Enter to send)"
                    className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!draft.trim() || isSending}
                    className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                    aria-label="Send message"
                  >
                    {isSending ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <Send className="w-6 h-6 text-blue-300 ml-1" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Select a Conversation</h3>
              <p className="text-slate-500 mt-1 max-w-sm text-sm">
                Choose a patient from the list to view their message history and reply securely.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
