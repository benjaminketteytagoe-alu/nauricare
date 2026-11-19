"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { RealtimeEvent } from "@/server/realtime/bus";

// One EventSource per tab, shared by every component that needs live data
// (chat, notification bell, notifications page). EventSource reconnects on
// its own; the server's `retry:` hint sets the delay.

type EventType = RealtimeEvent["type"];
type Handler<T extends EventType> = (event: Extract<RealtimeEvent, { type: T }>) => void;

interface RealtimeContextValue {
  subscribe<T extends EventType>(type: T, handler: Handler<T>): () => void;
  connected: boolean;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const listeners = useRef(new Map<EventType, Set<(e: RealtimeEvent) => void>>());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource("/api/realtime");
    const dispatch = (type: EventType) => (msg: MessageEvent) => {
      try {
        const event = JSON.parse(msg.data) as RealtimeEvent;
        listeners.current.get(type)?.forEach((h) => h(event));
      } catch {
        /* malformed event: ignore */
      }
    };
    const types: EventType[] = ["message", "notification", "presence"];
    const handlers = types.map((t) => [t, dispatch(t)] as const);
    handlers.forEach(([t, h]) => source.addEventListener(t, h as EventListener));
    source.addEventListener("ready", () => setConnected(true));
    source.onerror = () => setConnected(false);
    return () => {
      handlers.forEach(([t, h]) => source.removeEventListener(t, h as EventListener));
      source.close();
    };
  }, []);

  const value: RealtimeContextValue = {
    connected,
    subscribe(type, handler) {
      const set = listeners.current.get(type) ?? new Set();
      set.add(handler as (e: RealtimeEvent) => void);
      listeners.current.set(type, set);
      return () => set.delete(handler as (e: RealtimeEvent) => void);
    },
  };
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

/** Calls `handler` for each live event of `type`. Safe outside a provider (no-op). */
export function useRealtime<T extends EventType>(type: T, handler: Handler<T>) {
  const ctx = useContext(RealtimeContext);
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    if (!ctx) return;
    return ctx.subscribe(type, ((e: Extract<RealtimeEvent, { type: T }>) => ref.current(e)) as Handler<T>);
  }, [ctx, type]);
}

export function useRealtimeStatus(): boolean {
  return useContext(RealtimeContext)?.connected ?? false;
}
