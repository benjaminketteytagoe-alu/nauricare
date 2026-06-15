import { createHmac, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import type { AgentDefinition } from "@/agents/nauri-agent";

/**
 * createTokenHandler — higher-order function that returns a Next.js route GET
 * handler which issues a short-lived HMAC-signed session token for the given
 * agent definition.  The token is consumed by AgentChat to authenticate
 * individual chat sessions without exposing the API key to the browser.
 *
 * Token format: base64url(payload).HMAC-SHA256(payload)
 */
export function createTokenHandler(agent: AgentDefinition) {
  return async function GET(): Promise<NextResponse> {
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
