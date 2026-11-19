import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-guards";
import { subscribe, type RealtimeEvent } from "@/server/realtime/bus";

// Server-sent events stream for the signed-in user: new direct messages and
// notifications. Same-instance events arrive instantly via the in-process
// bus; a light DB catch-up poll covers events created on other instances.
// Heartbeats keep Cloudflare (100 s idle limit) from closing the stream.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POLL_MS = 4_000;
const HEARTBEAT_MS = 20_000;
const PRESENCE_MS = 45_000;

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  const seen = new Set<string>();
  let since = new Date();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          close();
        }
      };
      const deliver = (e: RealtimeEvent) => {
        const key = `${e.type}:${"id" in e ? e.id : ""}`;
        if ("id" in e) {
          if (seen.has(key)) return;
          seen.add(key);
          if (seen.size > 500) seen.clear();
        }
        send(e.type, e);
      };

      const touchPresence = () =>
        prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } }).catch(() => {});

      const poll = async () => {
        const from = since;
        since = new Date();
        const [messages, notifications] = await Promise.all([
          prisma.directMessage.findMany({
            where: { receiverId: user.id, createdAt: { gte: new Date(from.getTime() - 1000) } },
            orderBy: { createdAt: "asc" },
            take: 50,
            include: { sender: { select: { id: true, name: true } } },
          }),
          prisma.userNotification.findMany({
            where: { recipientId: user.id, createdAt: { gte: new Date(from.getTime() - 1000) } },
            select: { id: true },
            take: 50,
          }),
        ]).catch(() => [[], []] as const);
        for (const m of messages) deliver({ type: "message", id: m.id, senderId: m.senderId, receiverId: m.receiverId, content: m.content, createdAt: m.createdAt.toISOString(), sender: m.sender });
        for (const n of notifications) deliver({ type: "notification", id: n.id });
      };

      const unsubscribe = subscribe(user.id, deliver);
      const pollTimer = setInterval(() => void poll(), POLL_MS);
      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(`: ping\n\n`));
      }, HEARTBEAT_MS);
      const presence = setInterval(() => void touchPresence(), PRESENCE_MS);

      function close() {
        if (closed) return;
        closed = true;
        unsubscribe();
        clearInterval(pollTimer);
        clearInterval(heartbeat);
        clearInterval(presence);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }

      req.signal.addEventListener("abort", close);
      void touchPresence();
      controller.enqueue(encoder.encode(`retry: 5000\n\n`));
      send("ready", { userId: user.id });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
