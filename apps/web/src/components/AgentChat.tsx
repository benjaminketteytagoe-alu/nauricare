"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, ShieldCheck } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const QUICK_PROMPTS = [
  "What are common signs of PCOS?",
  "How do fibroids affect fertility?",
  "What should I track in my cycle?",
];

export function AgentChat() {
  const [messages, setMessages]             = useState<Message[]>([]);
  const [input, setInput]                   = useState("");
  const [isStreaming, setIsStreaming]        = useState(false);
  const [streamingText, setStreamingText]   = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setIsStreaming(true);
    setStreamingText("");

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "I'm having trouble connecting right now. Please try again, or book a consultation with one of our specialists." },
        ]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setStreamingText(full);
      }

      setMessages((prev) => [...prev, { role: "assistant", content: full }]);
      setStreamingText("");
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const showWelcome = messages.length === 0 && !isStreaming;

  return (
    <div className="flex flex-col h-[540px] bg-white rounded-3xl shadow-2xl overflow-hidden border border-teal-100/60">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-600 px-5 py-4 flex items-center gap-3.5">
        <div className="w-11 h-11 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-extrabold text-white text-base leading-none">Nauri</p>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <p className="text-xs text-teal-100 font-medium">Available 24/7 · AI-powered</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-teal-200 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" /> Private
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">

        {/* Welcome + quick prompts */}
        {showWelcome && (
          <>
            <div className="flex gap-3 items-start">
              <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
                <Bot className="w-4.5 h-4.5 text-teal-600" />
              </div>
              <div className="bg-teal-50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[86%] border border-teal-100">
                <p className="text-sm text-gray-800 leading-relaxed">
                  Hi, I&apos;m Nauri 👋 I&apos;m here to support you with women&apos;s health questions — whether it&apos;s PCOS, fibroids, cycle tracking, or hormonal health. How can I help you today?
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pl-12">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-left text-sm text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl px-4 py-2.5 transition-colors font-medium"
                >
                  {p}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Conversation history */}
        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          return (
            <div key={i} className={`flex gap-3 items-start ${isUser ? "flex-row-reverse" : ""}`}>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isUser ? "bg-teal-600" : "bg-teal-100"}`}
              >
                {isUser ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-teal-600" />
                )}
              </div>
              <div
                className={`rounded-2xl px-4 py-3 max-w-[82%] text-sm leading-relaxed ${
                  isUser
                    ? "bg-teal-600 text-white rounded-tr-sm"
                    : "bg-teal-50 text-gray-800 rounded-tl-sm border border-teal-100"
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {/* Streaming bubble */}
        {isStreaming && (
          <div className="flex gap-3 items-start">
            <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-teal-600" />
            </div>
            <div className="bg-teal-50 border border-teal-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[82%] text-sm text-gray-800 leading-relaxed min-h-[42px]">
              {streamingText ? (
                <>
                  {streamingText}
                  <span className="inline-block w-0.5 h-4 bg-teal-500 ml-0.5 animate-pulse align-middle" />
                </>
              ) : (
                <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Disclaimer ── */}
      <p className="text-center text-[10px] text-gray-400 px-4 py-1 border-t border-gray-50">
        Nauri provides educational information only · Not a substitute for medical advice
      </p>

      {/* ── Input ── */}
      <div className="px-4 pb-4 pt-2 flex items-center gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Nauri about women's health…"
          disabled={isStreaming}
          className="flex-1 text-sm text-gray-800 placeholder-gray-400 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all disabled:opacity-50"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isStreaming}
          className="w-11 h-11 bg-teal-600 hover:bg-teal-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl flex items-center justify-center text-white transition-all shrink-0"
          aria-label="Send message"
        >
          {isStreaming ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
