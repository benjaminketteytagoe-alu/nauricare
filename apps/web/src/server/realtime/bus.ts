import { EventEmitter } from "events";

// In-process pub/sub for server-sent events. Events published here reach
// subscribers on THIS server instantly; the SSE route also polls the database
// so events created on other instances (ECS can run several tasks) still
// arrive within a few seconds.

export type RealtimeEvent =
  | { type: "message"; id: string; senderId: string; receiverId: string; content: string; createdAt: string; sender: { id: string; name: string } }
  | { type: "notification"; id: string }
  | { type: "presence"; userId: string; online: boolean };

const globalForBus = globalThis as unknown as { __ncRealtimeBus?: EventEmitter };
const bus = globalForBus.__ncRealtimeBus ?? new EventEmitter();
bus.setMaxListeners(0); // one listener per open stream
globalForBus.__ncRealtimeBus = bus;

export function publish(userId: string, event: RealtimeEvent) {
  bus.emit(`user:${userId}`, event);
}

export function subscribe(userId: string, handler: (event: RealtimeEvent) => void): () => void {
  const key = `user:${userId}`;
  bus.on(key, handler);
  return () => bus.off(key, handler);
}
