import { createHmac, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import type { AgentDefinition } from "@/agents/nauri-agent";
import { getClientIp } from "@/lib/getClientIp";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

/**
 * createTokenHandler — higher-order function that returns a Next.js route GET
 * handler which issues a short-lived HMAC-signed session token for the given
 * agent definition.  The token is consumed by AgentChat to authenticate
 * individual chat sessions without exposing the API key to the browser.
 *
 * Token format: base64url(payload).HMAC-SHA256(payload)
 */
export function createTokenHandler(agent: AgentDefinition) {
  return async function GET(req: Request): Promise<NextResponse> {
    const ip = getClientIp(req.headers);
    const limit = rateLimit(`agent-token:${ip}`, 30, 5 * 60_000);
    if (!limit.allowed) return rateLimitResponse(limit);

    const secret = process.env.NEXTAUTH_SECRET ?? "dev-secret";
    const sessionId = randomBytes(16).toString("hex");

    const payloadObj = {
      sessionId,
      agentId: agent.agentId,
      model: agent.model,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const payloadB64 = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
    const sig = createHmac("sha256", secret).update(payloadB64).digest("base64url");

    return NextResponse.json(
      { token: `${payloadB64}.${sig}`, expiresIn: 3600, agentId: agent.agentId },
      {
        headers: {
          // Tokens are unique per-request and must never be cached by CDNs.
          "Cache-Control": "no-store, private",
        },
      }
    );
  };
}
