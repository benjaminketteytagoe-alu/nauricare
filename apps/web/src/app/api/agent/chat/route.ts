import { NextResponse } from "next/server";
import { nauriAgent } from "@/agents/nauri-agent";
import { getClientIp } from "@/lib/getClientIp";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

// Public endpoint: Nauri is embedded on the landing page for all visitors.
// No session to key on, so rate limiting is by IP — each call proxies to a
// paid Anthropic API, making this a real cost/abuse vector if unbounded.

type IncomingMessage = { role: string; content: string };

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers);
    const limit = rateLimit(`agent-chat:${ip}`, 15, 5 * 60_000);
    if (!limit.allowed) return rateLimitResponse(limit);

    const { messages } = (await req.json()) as { messages: IncomingMessage[] };

    if (!Array.isArray(messages) || messages.length === 0) {
      return new NextResponse("messages array required", { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    // Graceful degradation when the key is not yet configured
    if (!apiKey) {
      return new Response(
        "Nauri isn't fully configured yet — please ask your administrator to set the ANTHROPIC_API_KEY environment variable.",
        { headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    }

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: nauriAgent.model,
        max_tokens: nauriAgent.maxTokens,
        stream: true,
        system: nauriAgent.systemPrompt,
        messages: messages.map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        })),
      }),
    });

    if (!upstream.ok) {
      console.error("[NAURI_UPSTREAM_ERROR]", upstream.status, await upstream.text());
      return new Response(
        "Nauri is temporarily unavailable. Please try again shortly, or book a consultation with one of our specialists.",
        { headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    }

    // Forward only text_delta events from Anthropic's SSE stream as a
    // raw UTF-8 text stream.  The client reads it chunk-by-chunk for
    // a real-time typewriter effect.
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              const raw = line.slice(6).trim();
              if (!raw || raw === "[DONE]") continue;
              try {
                const event = JSON.parse(raw);
                if (
                  event.type === "content_block_delta" &&
                  event.delta?.type === "text_delta"
                ) {
                  controller.enqueue(encoder.encode(event.delta.text));
                }
              } catch {
                // Malformed SSE line — skip silently
              }
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("[NAURI_CHAT_FATAL]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
